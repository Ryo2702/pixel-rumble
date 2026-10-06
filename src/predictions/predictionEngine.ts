import { AUDIENCE } from '../config/audience';
import { BET_CONFIG, BET_LIMITS, formatSOL, generateRandomBet, payoutFor } from '../economy/currency';
import { validateWager } from '../economy/predictions';
import type { Phase, RoundEvent } from '../types';
import { LIVE_PREDICTION_CONFIG } from './predictionConfig';
import { generatePrediction, type PredictionGenerationContext } from './predictionGenerator';
import { refreshMarketOdds, type LiveOddsContext } from './predictionOdds';
import { betStatusFor, resolveAtDeadline, resolveFromEvent, type MarketResolution } from './predictionResolver';
import { emptyLiveStats, recordLiveResult } from './predictionHistory';
import type { BattleEvent, LiveAudienceBet, LiveBetStatus, LiveCrowdShare, LiveLeaderboardEntry, LivePredictionActivity, LivePredictionBet, LivePredictionMarket, LivePredictionRecord, LivePredictionSnapshot, LivePredictionStats } from './predictionTypes';

interface PredictionContext extends LiveOddsContext {
  round: number;
  phase: Phase;
  time: number;
  event: RoundEvent;
  remaining: number;
}

interface PredictionEngineHooks {
  getBalance: () => number;
  debit: (amount: number) => void;
  credit: (amount: number) => void;
  transaction: (id: string, label: string, amount: number) => void;
  feed: (text: string, detail: string, color: string, kind: string) => void;
  achievement: (name: string) => void;
  onChange: () => void;
}

type InternalMarket = LivePredictionMarket & {
  userBet?: LivePredictionBet;
  audienceBets: LiveAudienceBet[];
  resultVisibleUntil?: number;
};

interface AudienceLiveStats {
  id: string;
  username: string;
  avatar: string;
  stats: LivePredictionStats;
}

const resolvedStatuses: LiveBetStatus[] = ['WON', 'LOST', 'PUSH', 'VOID', 'EXPIRED'];
const isResolved = (status: LiveBetStatus) => resolvedStatuses.includes(status);

export class PredictionEngine {
  private markets: InternalMarket[] = [];
  private history: LivePredictionRecord[];
  private stats: LivePredictionStats;
  private audienceStats = new Map<string, AudienceLiveStats>();
  private activity: LivePredictionActivity[] = [];
  private clock = 0;
  private oddsClock = 0;
  private audienceClock = 0;
  private nextMarketAt = 0;
  private sequence = 0;
  private activityId = 0;
  private lastResult: LivePredictionRecord | null = null;

  constructor(private hooks: PredictionEngineHooks, private random: () => number = Math.random, stats?: LivePredictionStats, history: LivePredictionRecord[] = []) {
    this.stats = stats ? { ...stats } : emptyLiveStats();
    this.history = history.slice(0, LIVE_PREDICTION_CONFIG.maxHistory).map(record => ({ ...record }));
  }

  get time() { return this.clock; }
  get liveStats() { return this.stats; }
  get liveHistory() { return this.history; }

  beginRound(context: PredictionContext) {
    this.clock = 0; this.oddsClock = 0; this.audienceClock = 0; this.nextMarketAt = 0; this.sequence = 0; this.markets = [];
    this.handleEvent({ type: 'ROUND_STARTED', round: context.round, time: 0 }, { ...context, time: 0 });
  }

  handleEvent(event: BattleEvent, context: PredictionContext) {
    this.clock = Math.max(this.clock, event.time);
    const current = { ...context, time: this.clock };
    if (event.type === 'ROUND_ENDING') this.markets.filter(market => market.status === 'OPEN').forEach(market => this.lockMarket(market));
    for (const market of this.markets.filter(candidate => candidate.status !== 'RESOLVED')) {
      const resolution = resolveFromEvent(market, event);
      if (resolution) this.resolveMarket(market, resolution);
    }
    if (event.type !== 'ROUND_ENDED') this.tryGenerate(current, event.type, event);
    this.cleanup();
  }

  update(dt: number, context: PredictionContext) {
    this.clock += Math.max(0, dt);
    const current = { ...context, time: this.clock };
    this.cleanup();
    if (current.phase !== 'rumble') return;
    for (const market of this.markets.filter(candidate => candidate.status === 'OPEN' && this.clock >= candidate.closesAt)) {
      this.lockMarket(market);
      const resolution = resolveAtDeadline(market, current.fighters);
      if (resolution) this.resolveMarket(market, resolution);
    }
    this.oddsClock += dt;
    if (this.oddsClock >= LIVE_PREDICTION_CONFIG.oddsRefreshSeconds) {
      this.oddsClock = 0;
      for (const market of this.markets.filter(candidate => candidate.status === 'OPEN')) market.selections = refreshMarketOdds(market, current);
    }
    this.audienceClock += dt;
    if (this.audienceClock >= LIVE_PREDICTION_CONFIG.audienceTickSeconds) {
      this.audienceClock = 0;
      for (const market of this.markets.filter(candidate => candidate.status === 'OPEN')) this.simulateAudience(market);
    }
    const active = this.markets.filter(market => market.status !== 'RESOLVED').length;
    if (active < LIVE_PREDICTION_CONFIG.maxVisible && this.clock >= this.nextMarketAt) this.tryGenerate(current, 'ROUND_STARTED', { type: 'ROUND_STARTED', round: current.round, time: this.clock });
    this.cleanup();
  }

  place(marketId: string, selectionId: string, amount: number): string | null {
    const market = this.markets.find(candidate => candidate.id === marketId);
    if (!market || market.status !== 'OPEN') return 'This live prediction is locked.';
    if (market.userBet) return 'You already placed a prediction here.';
    const selection = market.selections.find(candidate => candidate.id === selectionId);
    if (!selection) return 'Select an available outcome.';
    const error = validateWager(amount, this.hooks.getBalance());
    if (error) return error;
    const bet: LivePredictionBet = { id: `live-bet-${market.id}`, predictionId: market.id, round: market.round, kind: market.kind, question: market.question, selectionId, selectionLabel: selection.label, stake: amount, lockedOdds: selection.odds, placedAt: Date.now(), status: 'OPEN', payout: 0 };
    this.hooks.debit(amount);
    market.userBet = bet;
    this.hooks.transaction(bet.id, `Live prediction · ${selection.label}`, -amount);
    this.addActivity(`YOU → ${formatSOL(amount)}`, `${selection.label} · ${selection.odds.toFixed(2)}× locked`, selection.color);
    this.hooks.feed('Live prediction placed', `${selection.label} · ${formatSOL(amount)} at ${selection.odds.toFixed(2)}×`, '#d6f65c', 'prediction');
    this.hooks.onChange();
    return null;
  }

  openBets(): LivePredictionRecord[] {
    return this.markets.filter(market => market.userBet && !isResolved(market.userBet.status)).map(market => ({ ...market.userBet!, profit: 0 }));
  }

  snapshot(): LivePredictionSnapshot {
    const visible = this.markets.filter(market => market.status !== 'RESOLVED' || (market.resultVisibleUntil ?? 0) > this.clock).sort((a, b) => Number(a.status === 'RESOLVED') - Number(b.status === 'RESOLVED')).slice(0, LIVE_PREDICTION_CONFIG.maxVisible);
    const primary = visible[0];
    const distribution = primary ? this.distribution(primary) : [];
    const markets = visible.map(market => ({ ...market, selections: market.selections.map(selection => ({ ...selection })), audienceBets: undefined, secondsRemaining: market.status === 'OPEN' ? Math.max(0, market.closesAt - this.clock) : 0, userBet: market.userBet ? { ...market.userBet } : undefined, audienceCount: market.audienceBets.length, audienceTotal: market.audienceBets.reduce((sum, bet) => sum + bet.amount, 0), distribution: this.distribution(market) })) as LivePredictionSnapshot['markets'];
    return { markets, recentActivity: this.activity.map(item => ({ ...item })), distribution, predictionCount: primary?.audienceBets.length ?? 0, totalStaked: primary?.audienceBets.reduce((sum, bet) => sum + bet.amount, 0) ?? 0, stats: { ...this.stats }, leaderboard: this.leaderboard(), latestResult: this.lastResult ? { ...this.lastResult } : null };
  }

  private tryGenerate(context: PredictionContext, trigger: BattleEvent['type'], event: BattleEvent) {
    if (this.markets.filter(market => market.status !== 'RESOLVED').length >= LIVE_PREDICTION_CONFIG.maxVisible) return;
    const blocked = new Set(this.markets.filter(market => market.status !== 'RESOLVED').map(market => market.kind));
    const market = generatePrediction(context as PredictionGenerationContext, trigger, event, this.sequence++, blocked);
    if (!market) return;
    this.markets.unshift({ ...market, audienceBets: [] });
    this.nextMarketAt = this.clock + 2;
    this.addActivity('LIVE PREDICTION', market.question, '#d6f65c');
  }

  private lockMarket(market: InternalMarket) {
    if (market.status !== 'OPEN') return;
    market.status = 'LOCKED';
    if (market.userBet?.status === 'OPEN') market.userBet.status = 'LOCKED';
    this.addActivity('BETTING LOCKED', market.question, '#f3b95b');
  }

  private resolveMarket(market: InternalMarket, resolution: MarketResolution) {
    if (market.status === 'RESOLVED') return;
    market.status = 'RESOLVED'; market.resolvedAt = this.clock; market.resultVisibleUntil = this.clock + LIVE_PREDICTION_CONFIG.resultHoldSeconds;
    market.outcomeSelectionId = resolution.selectionId;
    market.outcomeLabel = resolution.selectionId ? market.selections.find(selection => selection.id === resolution.selectionId)?.label : resolution.status;
    if (market.userBet) {
      const result = betStatusFor(resolution, market.userBet.selectionId);
      const payout = result.status === 'WON' ? payoutFor(market.userBet.stake, market.userBet.lockedOdds) : result.payout ? market.userBet.stake : 0;
      market.userBet.status = result.status; market.userBet.payout = payout; market.userBet.resolvedAt = Date.now();
      const record: LivePredictionRecord = { ...market.userBet, profit: payout - market.userBet.stake };
      this.history.unshift(record); this.history = this.history.slice(0, LIVE_PREDICTION_CONFIG.maxHistory); recordLiveResult(this.stats, record); this.lastResult = record;
      if (payout) { this.hooks.credit(payout); this.hooks.transaction(`live-payout-${record.id}`, `Live prediction ${result.status.toLowerCase()} · ${record.selectionLabel}`, payout); }
      const won = result.status === 'WON';
      this.hooks.feed(won ? 'Live prediction won' : result.status === 'LOST' ? 'Live prediction lost' : `Live prediction ${result.status.toLowerCase()}`, won ? `${formatSOL(payout)} returned · ${record.selectionLabel}` : `${record.selectionLabel} · ${formatSOL(record.stake)}`, won ? '#d6f65c' : result.status === 'LOST' ? '#f08794' : '#f3b95b', 'prediction');
      if (won) this.hooks.achievement('Called it live');
      if (this.stats.total === 1) this.hooks.achievement('Live wire');
    }
    for (const bet of market.audienceBets) {
      const result = betStatusFor(resolution, bet.selectionId);
      bet.status = result.status; bet.payout = result.status === 'WON' ? payoutFor(bet.amount, bet.odds) : result.payout ? bet.amount : 0;
      const audience = this.audienceStats.get(bet.username);
      if (audience) recordLiveResult(audience.stats, { id: bet.id, predictionId: market.id, round: market.round, kind: market.kind, question: market.question, selectionId: bet.selectionId, selectionLabel: bet.selectionLabel, stake: bet.amount, lockedOdds: bet.odds, placedAt: bet.placedAt, status: bet.status, payout: bet.payout, profit: bet.payout - bet.amount });
    }
    this.addActivity(market.outcomeLabel ? `${market.outcomeLabel} HIT` : 'PREDICTION VOID', market.question, market.outcomeSelectionId ? '#d6f65c' : '#f3b95b');
    this.hooks.onChange();
  }

  private simulateAudience(market: InternalMarket) {
    const bets = 1 + Math.floor(this.random() * 3);
    for (let i = 0; i < bets; i++) {
      const selection = this.pickSelection(market.selections);
      const amount = generateRandomBet({ min: BET_CONFIG.minBet, max: BET_CONFIG.maxBet, balance: BET_LIMITS.max });
      if (!selection || amount === null) continue;
      const index = Math.floor(this.random() * AUDIENCE.knownNames.length);
      const username = AUDIENCE.knownNames[index] ?? `PixelSpectator${index}`;
      const avatar = AUDIENCE.colors[index % AUDIENCE.colors.length];
      const bet: LiveAudienceBet = { id: `live-crowd-${market.id}-${market.audienceBets.length}`, predictionId: market.id, username, avatar, selectionId: selection.id, selectionLabel: selection.label, amount, odds: selection.odds, status: 'OPEN', payout: 0, placedAt: Date.now() };
      market.audienceBets.push(bet);
      if (!this.audienceStats.has(username)) this.audienceStats.set(username, { id: `audience-${username}`, username, avatar, stats: emptyLiveStats() });
      if (amount >= AUDIENCE.largeBet) this.addActivity(`WHALE PREDICTION`, `${username} → ${formatSOL(amount)} on ${selection.label}`, '#f3b95b');
      else if (this.random() > 0.45) this.addActivity(username, `${formatSOL(amount)} on ${selection.label}`, avatar);
    }
  }

  private pickSelection(selections: LivePredictionMarket['selections']) {
    const weights = selections.map(selection => 1 / Math.max(1, selection.odds));
    let pick = this.random() * weights.reduce((sum, weight) => sum + weight, 0);
    return selections[weights.findIndex(weight => (pick -= weight) <= 0)] ?? selections.at(-1);
  }

  private distribution(market: InternalMarket): LiveCrowdShare[] {
    const total = market.audienceBets.reduce((sum, bet) => sum + bet.amount, 0);
    return market.selections.map(selection => {
      const bets = market.audienceBets.filter(bet => bet.selectionId === selection.id);
      const amount = bets.reduce((sum, bet) => sum + bet.amount, 0);
      return { selectionId: selection.id, label: selection.label, color: selection.color, amount, count: bets.length, percent: total ? amount / total * 100 : 0 };
    });
  }

  private addActivity(text: string, detail: string, color: string) {
    this.activity.unshift({ id: ++this.activityId, text, detail, color, time: Date.now() });
    this.activity = this.activity.slice(0, LIVE_PREDICTION_CONFIG.maxActivity);
  }

  private cleanup() {
    this.markets = this.markets.filter(market => market.status !== 'RESOLVED' || (market.resultVisibleUntil ?? 0) > this.clock);
  }

  private leaderboard(): LiveLeaderboardEntry[] {
    const rows: LiveLeaderboardEntry[] = [...this.audienceStats.values()].map(person => ({ ...person.stats, id: person.id, username: person.username, avatar: person.avatar, rank: 0, winRate: person.stats.total ? person.stats.won / person.stats.total * 100 : 0, isUser: false }));
    rows.push({ ...this.stats, id: 'you', username: 'YOU', avatar: '#d6f65c', rank: 0, winRate: this.stats.total ? this.stats.won / this.stats.total * 100 : 0, isUser: true });
    rows.sort((a, b) => b.profit - a.profit || b.won - a.won || a.id.localeCompare(b.id));
    rows.forEach((row, index) => { row.rank = index + 1; });
    return rows.slice(0, 20);
  }
}
