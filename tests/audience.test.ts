import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIENCE } from '../src/config/audience';
import { GameEngine } from '../src/game/engine';
import { AudienceEngine } from '../src/simulation/audienceEngine';
import { SeededRandom, generateSpectators } from '../src/simulation/spectatorGenerator';
import { pickFighter, createAudienceBet } from '../src/simulation/bettingBehavior';
import { emptyStats, periodKeys, rankSpectators } from '../src/simulation/leaderboardEngine';
import { formatSOL, payoutFor, solToLamports } from '../src/economy/currency';
import { validateWager } from '../src/economy/predictions';
import { freshSave, loadSave } from '../src/economy/persistence';
import type { AudienceSave } from '../src/simulation/types';
import type { SaveData } from '../src/types';

const NOW = Date.UTC(2026, 9, 6, 12);
function fixture() { return new GameEngine({ load: () => null, save: () => {} }, new SeededRandom(81).next); }
function tick(audience: AudienceEngine, fighters: GameEngine['fighters'], seconds: number) { for (let i = 0; i < seconds * 4; i++) audience.update(0.25, 'betting', 22 - i / 4, fighters); }

test('seeded population and behavior are reproducible, varied, and financially bounded', () => {
  const a = generateSpectators(new SeededRandom(12).next, NOW), b = generateSpectators(new SeededRandom(12).next, NOW);
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map(p => p.username)).size, AUDIENCE.population);
  assert.equal(new Set(a.map(p => p.personality)).size, 5);
  const fighters = fixture().fighters;
  const rng = new SeededRandom(9);
  const averageOdds = (personality: 'conservative' | 'underdog') => Array.from({ length: 2000 }, () => pickFighter({ ...a[0], personality }, fighters, rng.next).odds).reduce((sum, odds) => sum + odds, 0) / 2000;
  assert.ok(averageOdds('underdog') > averageOdds('conservative') + 1);
  for (const person of a.slice(0, 400)) {
    const bet = createAudienceBet(person, fighters, 1, 'STANDARD RUMBLE', rng.next, NOW);
    if (bet) assert.ok(bet.amount > 0 && bet.amount <= person.balance && bet.odds >= 1.2);
  }
});

test('crowd simulated SOL sums exactly, odds move only while open, and accepted odds never drift', () => {
  const fighters = fixture().fighters, originalOdds = fighters.map(f => f.odds);
  const audience = new AudienceEngine(undefined, () => NOW, 23);
  audience.beginRound(1, fighters, 'STANDARD RUMBLE');
  tick(audience, fighters, 22);
  const open = audience.snapshot(), accepted = structuredClone(audience.export().pending);
  assert.ok(open.betCount > 800 && open.betCount < AUDIENCE.population);
  assert.equal(open.totalBets, accepted.reduce((sum, b) => sum + b.amount, 0));
  assert.equal(open.totalBets, open.distribution.reduce((sum, s) => sum + s.amount, 0));
  assert.ok(Math.abs(open.distribution.reduce((sum, s) => sum + s.percent, 0) - 100) < 1e-8);
  assert.notDeepEqual(fighters.map(f => f.odds), originalOdds);
  assert.ok(accepted.some(b => b.amount >= AUDIENCE.largeBet));
  audience.lock(); const lockedOdds = fighters.map(f => f.odds);
  for (let i = 0; i < 40; i++) audience.update(0.25, 'rumble', 40, fighters);
  const locked = audience.snapshot();
  assert.deepEqual(locked.distribution, open.distribution);
  assert.equal(locked.totalBets, open.totalBets); assert.equal(locked.betCount, open.betCount);
  assert.deepEqual(fighters.map(f => f.odds), lockedOdds);
  assert.deepEqual(audience.export().pending, accepted);
  assert.ok(locked.recentBets.length <= 12 && locked.reactions.length <= 24);
  assert.ok(JSON.stringify(locked).length < 50000);
});

test('audience settlement pays locked odds once and records persist across reload and time filters', () => {
  const fighters = fixture().fighters;
  const audience = new AudienceEngine(undefined, () => NOW, 18);
  const initial = new Map(audience.spectators.map(p => [p.id, { balance: p.balance, bets: p.totalBets, profit: p.profit }]));
  audience.beginRound(1, fighters, 'STANDARD RUMBLE'); tick(audience, fighters, 22);
  const bets = structuredClone(audience.export().pending);
  const winner = fighters[0], outcomes = { winner: winner.id, team: 'fighters', damage: winner.id, survival: winner.id };
  const result = audience.settle(outcomes, winner)!;
  assert.equal(result.winningBets, bets.filter(b => b.fighterId === winner.id).length);
  assert.equal(result.paid, bets.filter(b => b.fighterId === winner.id).reduce((sum, b) => sum + payoutFor(b.amount, b.odds), 0));
  for (const bet of bets) {
    const p = audience.spectators.find(p => p.id === bet.spectatorId)!, old = initial.get(p.id)!;
    const paid = bet.fighterId === winner.id ? payoutFor(bet.amount, bet.odds) : 0;
    assert.equal(p.balance, old.balance - bet.amount + paid);
    assert.equal(p.totalBets, old.bets + 1); assert.equal(p.profit, old.profit + paid - bet.amount);
  }
  const saved = structuredClone(audience.export());
  audience.settle(outcomes, winner);
  assert.deepEqual(audience.export().spectators, saved.spectators);
  const restored = new AudienceEngine(structuredClone(saved), () => NOW);
  assert.deepEqual(restored.spectators, audience.spectators);
  assert.equal(restored.results?.paid, result.paid);
  assert.deepEqual(restored.leaderboard().rows, audience.leaderboard().rows);
  const nextWeek = new AudienceEngine(structuredClone(saved), () => NOW + 7 * 86400000);
  assert.ok(nextWeek.leaderboard('wins', 'today').rows.every(p => p.totalBets === 0));
  assert.ok(nextWeek.leaderboard('wins', 'week').rows.every(p => p.totalBets === 0));
  assert.ok(nextWeek.leaderboard('wins', 'all').rows[0].totalBets > 0);
  assert.ok(JSON.stringify(saved).length < 2400000, 'community fits localStorage with room for the game');
});

test('interrupted crowd bets refund once; legacy currency saves reset safely', () => {
  const fighters = fixture().fighters, audience = new AudienceEngine(undefined, () => NOW);
  const before = new Map(audience.spectators.map(p => [p.id, p.balance]));
  audience.beginRound(1, fighters, 'STANDARD RUMBLE'); tick(audience, fighters, 5);
  const restored = new AudienceEngine(structuredClone(audience.export()), () => NOW);
  assert.ok(restored.spectators.every(p => p.balance === before.get(p.id)));
  const again = new AudienceEngine(structuredClone(restored.export()), () => NOW);
  assert.deepEqual(again.spectators, restored.spectators);
  const legacy = { ...freshSave(), version: 1, balance: 4321, roundsWatched: 4 };
  const save = loadSave({ load: () => legacy, save: () => {} });
  assert.equal(save.version, 3); assert.equal(save.balance, solToLamports(84.5)); assert.equal(save.roundsWatched, 0);
  assert.equal(formatSOL(solToLamports(10)), '10.00 SOL'); assert.equal(validateWager(solToLamports(0.25), solToLamports(1)), null);
  assert.ok(validateWager(solToLamports(0.25) + 1, solToLamports(1))); assert.equal(payoutFor(solToLamports(50.25), 2.75), solToLamports(138.19));
});

test('all six ranking modes respect periods and always expose the actual user', () => {
  const rng = new SeededRandom(4), people = generateSpectators(rng.next, NOW, 6), user = { ...people.pop()!, id: 'you', username: 'YOU' };
  user.profit = solToLamports(1_000_000); user.today.profit = -solToLamports(100);
  people[0].today.profit = solToLamports(1_000_000);
  for (const metric of ['profit', 'wins', 'winRate', 'biggestWin', 'streak', 'losses'] as const) {
    const { rows, user: rank } = rankSpectators(people, user, metric, 'all', NOW);
    assert.equal(rows.length, 6); assert.ok(rank.rank >= 1 && rank.rank <= 6); assert.equal(rank.id, 'you');
    const score = (entry: typeof rank) => metric === 'losses' ? entry.lostAmount : entry[metric];
    assert.ok(rows.every((row, i) => !i || score(rows[i - 1]) >= score(row)));
  }
  assert.equal(rankSpectators(people, user, 'profit', 'all', NOW).user.rank, 1);
  assert.equal(rankSpectators(people, user, 'profit', 'today', NOW).rows[0].id, people[0].id);
  assert.equal(periodKeys(Date.UTC(2026, 9, 5)).week, '2026-10-05');
});

test('boss bet types settle against their own outcomes; market shocks never affect payouts', () => {
  const fighters = fixture().fighters, audience = new AudienceEngine(undefined, () => NOW, 47);
  audience.beginRound(5, fighters, 'BOSS INVASION'); tick(audience, fighters, 22);
  const pending = structuredClone(audience.export().pending);
  assert.equal(new Set(pending.map(p => p.type)).size, 4);
  const outcomes = { winner: 'byte', team: 'boss', damage: 'nova', survival: 'tank' };
  const expected = pending.filter(p => p.fighterId === outcomes[p.type]).reduce((sum, b) => sum + payoutFor(b.amount, b.odds), 0);
  const result = audience.settle(outcomes, fighters[0])!;
  assert.equal(result.paid, expected);
  const reactions = audience.snapshot().reactions;
  audience.signal({ kind: 'streak', fighter: 'KIRA' });
  assert.ok(audience.snapshot().reactions[0].text.includes('KIRA'));
  assert.notDeepEqual(audience.snapshot().reactions, reactions);
  const broken = { version: 1, currency: 'SOL', spectators: [null], user: null, market: [null] } as unknown as AudienceSave;
  assert.doesNotThrow(() => new AudienceEngine(broken, () => NOW));
});

test('user results are included in audience summaries and persistent user rankings exactly once', () => {
  let stored: SaveData | null = null;
  const game = new GameEngine({ load: () => stored, save: s => { stored = structuredClone(s); } }, new SeededRandom(13).next);
  game.placePrediction('byte', solToLamports(0.25));
  for (let i = 0; i < 84 * 60; i++) game.update(1 / 60);
  const user = game.audience.user, result = game.audience.results!, p = game.save.predictions[0];
  assert.equal(user.totalBets, 1); assert.equal(user.profit, p.payout - p.amount);
  assert.equal(result.user?.isUser, true); assert.equal(result.user?.payout, p.payout);
  assert.equal(game.getSnapshot().save.balance, game.save.balance);
  assert.equal('community' in game.getSnapshot().save, false);
  assert.equal(user.balance, game.save.balance);
  assert.equal(user.today.key, periodKeys(Date.now()).today);
  assert.notDeepEqual(user.today, emptyStats());
});
