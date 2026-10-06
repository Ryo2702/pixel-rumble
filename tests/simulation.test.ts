import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/game/engine';
import { CONFIG } from '../src/config/game';
import { freshSave, loadSave } from '../src/economy/persistence';
import { settlePrediction, validateWager } from '../src/economy/predictions';
import { solToLamports } from '../src/economy/currency';
import type { Prediction, SaveData } from '../src/types';

function setup(seed = 14) {
  let stored: SaveData | null = null;
  const adapter = { load: () => stored ? structuredClone(stored) : null, save: (value: SaveData) => { stored = structuredClone(value); } };
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  return { game: new GameEngine(adapter, random), adapter };
}
function advance(game: GameEngine, seconds: number) { for (let n = 0; n < Math.ceil(seconds * 60); n++) game.update(1 / 60); }

test('a full autonomous round validates wagers, resurrects fighters, settles once, and rotates arenas', () => {
  const { game } = setup();
  const stake = solToLamports(5);
  const events: string[] = []; game.onEffect(e => events.push(e.kind));
  assert.equal(game.placePrediction('invalid', stake), 'Select an available fighter.');
  for (const bad of [NaN, Infinity, -stake, 12.5, solToLamports(0.01), solToLamports(20.01)]) assert.ok(validateWager(bad, solToLamports(84.5)));
  assert.ok(validateWager(stake, solToLamports(1)));
  assert.equal(game.placePrediction('byte', stake), null);
  const lockedOdds = game.save.predictions[0].odds;
  assert.equal(game.save.balance, solToLamports(84.5) - stake);
  assert.ok(game.placePrediction('nova', stake));
  advance(game, CONFIG.phases.betting + 0.05);
  assert.equal(game.phase, 'locked');
  assert.ok(game.placePrediction('nova', stake));
  advance(game, CONFIG.phases.locked + CONFIG.phases.rumble + 0.1);
  assert.equal(game.phase, 'results');
  assert.ok(events.includes('kill'));
  assert.ok(events.includes('respawn'));
  const p = game.save.predictions[0];
  assert.equal(p.odds, lockedOdds);
  assert.equal(p.status, p.fighterId === game.winner ? 'won' : 'lost');
  assert.equal(game.save.balance, solToLamports(84.5) - stake + p.payout + CONFIG.economy.spectatorReward);
  assert.equal(game.save.roundsWatched, 1);
  assert.equal(game.save.transactions.filter(t => t.id.startsWith('watch-')).length, 1);
  assert.ok(game.fighters.every(f => f.health >= 0 && f.health <= f.maxHealth && Number.isFinite(f.odds)));
  const balance = game.save.balance;
  settlePrediction(game.save, p, true);
  assert.equal(game.save.balance, balance);
  advance(game, CONFIG.phases.results + CONFIG.phases.resurrection + 0.1);
  assert.equal(game.round, 2); assert.equal(game.phase, 'betting');
  assert.equal(game.event, 'DOUBLE REWARDS');
  assert.ok(game.fighters.every(f => f.health === f.maxHealth));
  assert.equal(game.placePrediction('nova', solToLamports(1)), null);
  assert.equal(game.save.predictions[0].odds, Math.round(game.fighters[3].odds * 2 * 100) / 100);
});

test('interrupted predictions refund exactly once and completed rounds do not collide after reload', () => {
  const { game, adapter } = setup();
  game.placePrediction('byte', solToLamports(5));
  const restored = new GameEngine(adapter);
  assert.equal(restored.save.balance, CONFIG.economy.startingBalance);
  assert.equal(restored.save.predictions.length, 0);
  const again = new GameEngine(adapter);
  assert.equal(again.save.balance, CONFIG.economy.startingBalance);
  again.placePrediction('byte', solToLamports(5));
  advance(again, 84);
  assert.equal(again.phase, 'results');
  const afterResults = new GameEngine(adapter);
  assert.equal(afterResults.round, 2);
  assert.equal(afterResults.placePrediction('byte', solToLamports(1)), null);
  assert.equal(afterResults.save.predictions[0].status, 'pending');
});

test('win returns stake times locked odds; loss returns nothing; malformed saves are recoverable', () => {
  const save = freshSave(); save.balance = solToLamports(9);
  const p: Prediction = { id: 'test', round: 1, fighterId: 'byte', fighterName: 'BYTE', type: 'winner', amount: solToLamports(10), odds: 2.5, status: 'pending', payout: 0, createdAt: 0 };
  assert.equal(settlePrediction(save, p, true), solToLamports(25));
  assert.equal(save.balance, solToLamports(34));
  const lost = { ...p, id: 'lost', status: 'pending' as const, payout: 0 };
  assert.equal(settlePrediction(save, lost, false), 0);
  assert.equal(save.balance, solToLamports(34));
  assert.equal(loadSave({ load: () => ({ version: 1, balance: -1 }), save: () => {} }).balance, CONFIG.economy.startingBalance);
  assert.equal(loadSave({ load: () => { throw Error('storage unavailable'); }, save: () => {} }).balance, CONFIG.economy.startingBalance);
});

test('nine continuous rounds exercise every event, boss choices, arenas, and finite simulation state', () => {
  const { game } = setup(27);
  const seen = new Set<string>();
  for (let round = 1; round <= 9; round++) {
    assert.equal(game.round, round); seen.add(game.event);
    if (game.event === 'BOSS INVASION') assert.equal(game.placePrediction('fighters', solToLamports(1), 'team'), null);
    advance(game, 25.1);
    assert.equal(game.phase, 'rumble');
    assert.ok(game.placePrediction('byte', solToLamports(1)));
    let guard = 0;
    while (game.round === round && guard++ < 6000) game.update(1 / 60);
    assert.ok(guard < 6000, `round ${round} progressed`);
    assert.ok(game.fighters.every(f => Number.isFinite(f.x) && Number.isFinite(f.health) && Number.isFinite(f.odds) && f.odds >= 1.2));
    assert.ok(game.save.balance >= 0);
    if (round === 5) assert.notEqual(game.save.predictions[0].status, 'pending');
  }
  assert.equal(seen.size, 9);
  assert.equal(game.save.roundsWatched, 9);
  assert.equal(game.arena.id, 'forest');
});
