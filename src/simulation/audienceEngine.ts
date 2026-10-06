import { AUDIENCE } from '../config/audience';
import { CONFIG } from '../config/game';
import { quotedOdds } from '../economy/predictions';
import { BET_LIMITS, GAME_CURRENCY, SOL_CENTI_LAMPORTS } from '../economy/currency';
import { createAudienceBet } from './bettingBehavior';
import { CrowdActivity } from './crowdActivity';
import { currentPeriods, periodKeys, rankSpectators, recordResult } from './leaderboardEngine';
import { resultSummary, settleAudience } from './payoutEngine';
import { ReactionEngine } from './reactionEngine';
import { createUser, generateSpectators, SeededRandom, validSpectator } from './spectatorGenerator';
import type { Fighter, Phase, Prediction, RoundEvent } from '../types';
import type { AudienceBet, AudienceSave, AudienceSignal, AudienceSnapshot, CrowdShare, LeaderboardMetric, RoundOutcomes, RoundResults, Spectator, TimeFilter } from './types';

export class AudienceEngine {
  readonly spectators: Spectator[];
  readonly user: Spectator;
  readonly activity: CrowdActivity;
  readonly reactions: ReactionEngine;
  private random: SeededRandom;
  private people: Map<string, Spectator>;
  private queue: Spectator[] = [];
  private cursor = 0;
  private bets: AudienceBet[] = [];
  private displayBets: AudienceBet[] = [];
  private feedClock = 0;
  private lastFeedIndex = 0;
  private shares: CrowdShare[] = [];
  private total = 0;
  private count = 0;
  private clock = 0;
  private betBudget = 0;
  private oddsClock = 0;
  private baseOdds = new Map<string, number>();
  private round = 0;
  private event: RoundEvent = 'STANDARD RUMBLE';
  private lastSettledRound = 0;
  private cachedBoard = new Map<string, ReturnType<typeof rankSpectators>>();
  revision = 0;
  locked = false;
  results: RoundResults | null = null;

  constructor(stored?: AudienceSave, private now: () => number = Date.now, seed = AUDIENCE.seed) {
    this.random = new SeededRandom(Number.isSafeInteger(stored?.rng) ? stored!.rng : seed);
    const valid = stored?.version === 1 && stored.currency === GAME_CURRENCY.ticker && Array.isArray(stored.spectators) && stored.spectators.length === AUDIENCE.population && stored.spectators.every(validSpectator) && new Set(stored.spectators.map(p => p.id)).size === stored.spectators.length;
    this.spectators = valid ? stored.spectators : generateSpectators(this.random.next, now());
    this.user = stored?.user && validSpectator(stored.user) && stored.user.id === 'you' ? stored.user : createUser(now());
    this.people = new Map(this.spectators.map(person => [person.id, person]));
    this.activity = new CrowdActivity(Number.isFinite(stored?.watchers) ? Math.max(0, Math.min(AUDIENCE.population, stored!.watchers)) : AUDIENCE.baseWatchers);
    this.reactions = new ReactionEngine(this.random.next);
    this.lastSettledRound = valid && Number.isSafeInteger(stored.lastSettledRound) ? stored.lastSettledRound : 0;
    const results = stored?.results;
    if (valid && results && Number.isSafeInteger(results.round) && typeof results.winnerName === 'string' && Number.isFinite(results.paid) && Number.isFinite(results.odds) && Array.isArray(results.winners) && results.winners.every(b => b && typeof b.username === 'string' && Number.isFinite(b.amount) && Number.isFinite(b.payout))) this.results = results;
    // Recover interrupted audience bets just like the user's interrupted prediction.
    const refunded = new Set<string>();
    if (valid && Array.isArray(stored.pending)) for (const bet of stored.pending) {
      const person = this.people.get(bet?.spectatorId);
      if (person && bet.status === 'pending' && !bet.isUser && Number.isSafeInteger(bet.amount) && bet.amount % SOL_CENTI_LAMPORTS === 0 && bet.amount >= BET_LIMITS.min && bet.amount <= BET_LIMITS.max && !refunded.has(bet.id)) { person.balance += bet.amount; refunded.add(bet.id); }
    }
    this.spectators.forEach(person => currentPeriods(person, now()));
    currentPeriods(this.user, now());
  }
  signal(signal: AudienceSignal) {
    this.activity.signal(signal);
    this.reactions.signal(signal, this.spectators, this.now(), this.activity.elapsed);
  }
  beginRound(round: number, fighters: Fighter[], event: RoundEvent) {
    this.round = round; this.event = event; this.locked = false;
    this.bets = []; this.displayBets = []; this.feedClock = 0; this.lastFeedIndex = 0; this.total = 0; this.count = 0; this.betBudget = 0; this.cursor = 0; this.oddsClock = 0;
    this.baseOdds = new Map(fighters.map(f => [f.id, f.odds]));
    this.shares = fighters.map(f => ({ fighterId: f.id, name: f.name, color: f.color, amount: 0, count: 0, percent: 0 }));
    if (event === 'BOSS INVASION') this.shares.push({ fighterId: 'fighters', name: 'FIGHTERS', color: '#d6f65c', amount: 0, count: 0, percent: 0 }, { fighterId: 'boss', name: 'OVERLORD', color: '#f08794', amount: 0, count: 0, percent: 0 });
    this.queue = [...this.spectators];
    for (let i = this.queue.length - 1; i > 0; i--) { const j = Math.floor(this.random.next() * (i + 1)); [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]]; }
    const favorite = [...fighters].sort((a, b) => b.popularity - a.popularity)[0];
    this.signal({ kind: 'open', fighter: favorite.name, event });
    if (event === 'BOSS INVASION') this.signal({ kind: 'boss' });
    if (event === 'SUDDEN DEATH') this.signal({ kind: 'sudden' });
  }
  lock() { if (this.locked) return; this.locked = true; this.signal({ kind: 'lock' }); }
  private accept(bet: AudienceBet) {
    this.bets.push(bet); this.total += bet.amount; this.count++;
    const share = this.shares.find(s => s.fighterId === bet.fighterId);
    if (share) { share.amount += bet.amount; share.count++; }
    this.shares.forEach(s => { s.percent = this.total ? s.amount / this.total * 100 : 0; });
    if (bet.amount >= AUDIENCE.largeBet) this.signal({ kind: 'large-bet', fighter: bet.fighterName, amount: bet.amount });
  }
  addUserBet(prediction: Prediction) {
    if (this.locked || prediction.round !== this.round || this.bets.some(b => b.isUser)) return;
    this.accept({ ...prediction, spectatorId: 'you', username: 'YOU', avatar: '#d6f65c', isUser: true });
    this.displayBet(this.bets.at(-1)!);
  }
  private displayBet(bet: AudienceBet) {
    if (this.displayBets.some(b => b.id === bet.id)) return;
    this.displayBets.unshift(bet); this.displayBets = this.displayBets.slice(0, AUDIENCE.maxFeed);
  }
  update(dt: number, phase: Phase, remaining: number, fighters: Fighter[]) {
    this.clock += dt;
    if (this.clock < AUDIENCE.tickSeconds) return;
    const step = AUDIENCE.tickSeconds; this.clock -= step;
    this.activity.update(step);
    if (phase !== 'betting' || this.locked) return;
    this.betBudget += this.activity.betRate(remaining, CONFIG.phases.betting) * step;
    const batch = Math.min(AUDIENCE.maxBetsPerTick, Math.floor(this.betBudget));
    this.betBudget -= batch;
    for (let i = 0; i < batch && this.cursor < this.queue.length; i++) {
      const person = this.queue[this.cursor++];
      const bet = createAudienceBet(person, fighters, this.round, this.event, this.random.next, this.now());
      if (!bet) continue;
      person.balance -= bet.amount; this.accept(bet);
    }
    // Sample a readable tape while the full book continues to process every wager.
    this.feedClock += step;
    if (this.feedClock >= 0.75) {
      this.feedClock = 0;
      const unseen = this.bets.slice(this.lastFeedIndex);
      const selected = unseen.find(b => b.amount >= AUDIENCE.largeBet) ?? unseen.at(-1);
      if (selected) this.displayBet(selected);
      this.lastFeedIndex = this.bets.length;
    }
    this.oddsClock += step;
    if (this.oddsClock >= 1) {
      this.oddsClock = 0;
      fighters.forEach(f => {
        const base = this.baseOdds.get(f.id)!;
        const share = this.shares.find(s => s.fighterId === f.id)!;
        const pressure = Math.max(-AUDIENCE.crowdOddsLimit, Math.min(AUDIENCE.crowdOddsLimit, (1 / base - share.percent / 100) * AUDIENCE.crowdInfluence));
        f.odds = Math.round(Math.max(CONFIG.odds.min, Math.min(CONFIG.odds.max, base * (1 + pressure))) * 100) / 100;
      });
    }
  }
  settle(outcomes: RoundOutcomes, winner: Fighter, userPrediction?: Prediction): RoundResults | null {
    if (this.lastSettledRound >= this.round) return this.results;
    this.lock();
    settleAudience(this.bets, this.people, outcomes, this.now());
    if (userPrediction) {
      const userBet = this.bets.find(b => b.isUser);
      if (userBet) { Object.assign(userBet, userPrediction); recordResult(this.user, userBet, this.now()); }
    }
    this.lastSettledRound = this.round;
    this.results = resultSummary(this.round, winner.id, winner.name, quotedOdds(winner.odds, this.event), this.bets);
    this.revision++; this.cachedBoard.clear();
    const upset = winner.odds >= 8;
    this.signal({ kind: upset ? 'upset' : 'winner', fighter: winner.name, odds: winner.odds });
    return this.results;
  }
  leaderboard(metric: LeaderboardMetric = 'profit', time: TimeFilter = 'all') {
    const keys = periodKeys(this.now()), cacheKey = `${this.revision}-${metric}-${time}-${keys.today}`;
    if (!this.cachedBoard.has(cacheKey)) this.cachedBoard.set(cacheKey, rankSpectators(this.spectators, this.user, metric, time, this.now()));
    return this.cachedBoard.get(cacheKey)!;
  }
  snapshot(): AudienceSnapshot {
    const board = this.leaderboard();
    return { watchers: Math.round(this.activity.watchers), betCount: this.count, totalBets: this.total, excitement: this.activity.excitement, locked: this.locked, recentBets: this.displayBets.map(b => ({ ...b })), distribution: this.shares.map(s => ({ ...s })), reactions: [...this.reactions.messages], results: this.results, leaders: board.rows.slice(0, 5), userRank: board.user, revision: this.revision };
  }
  export(): AudienceSave {
    return { version: 1, currency: GAME_CURRENCY.ticker, rng: this.random.state, spectators: this.spectators, user: this.user, pending: this.bets.filter(b => b.status === 'pending' && !b.isUser), watchers: this.activity.watchers, lastSettledRound: this.lastSettledRound, results: this.results };
  }
}
