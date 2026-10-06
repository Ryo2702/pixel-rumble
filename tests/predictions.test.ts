import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config/game';
import { solToLamports } from '../src/economy/currency';
import { GameEngine } from '../src/game/engine';
import type { SaveData } from '../src/types';

function advance(game: GameEngine, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) game.update(1 / 60);
}

test('live predictions lock odds, reject duplicate bets, resolve from combat, and refund on reload', () => {
  let stored: SaveData | null = null;
  const adapter = { load: () => stored ? structuredClone(stored) : null, save: (value: SaveData) => { stored = structuredClone(value); } };
  const game = new GameEngine(adapter, () => 0.42);
  advance(game, CONFIG.phases.betting + CONFIG.phases.locked + 1);
  const market = game.getSnapshot().livePredictions.markets[0];
  assert.ok(market);
  assert.ok(market.audienceCount > 0);
  const stake = solToLamports(1.5);
  assert.equal(game.placeLivePrediction(market.id, market.selections[0].id, stake), null);
  const lockedOdds = game.livePredictions.openBets()[0].lockedOdds;
  assert.ok(game.placeLivePrediction(market.id, market.selections[0].id, stake));
  advance(game, CONFIG.phases.rumble + 0.2);
  assert.equal(game.livePredictions.liveHistory.length, 1);
  assert.equal(game.livePredictions.liveHistory[0].lockedOdds, lockedOdds);
  assert.ok(['WON', 'LOST', 'PUSH', 'VOID', 'EXPIRED'].includes(game.livePredictions.liveHistory[0].status));

  const next = new GameEngine(adapter, () => 0.42);
  advance(next, CONFIG.phases.betting + CONFIG.phases.locked + 0.1);
  const nextMarket = next.getSnapshot().livePredictions.markets[0];
  assert.ok(nextMarket);
  assert.equal(next.placeLivePrediction(nextMarket.id, nextMarket.selections[0].id, stake), null);
  const restored = new GameEngine(adapter, () => 0.42);
  assert.equal(restored.save.balance, next.save.balance + stake);
  assert.equal(restored.save.liveOpenBets.length, 0);
});
