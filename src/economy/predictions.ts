import { CONFIG, WEAPONS } from '../config/game';
import type { ArenaConfig, Fighter, Prediction, RoundEvent, SaveData } from '../types';
import { money, payoutFor, roundMoney } from './money';

export function calculateOdds(fighters: Fighter[], arena: ArenaConfig): void {
  const weights = fighters.map(f => {
    const form = f.recent.slice(-5).filter(Boolean).length;
    const weapon = WEAPONS[f.weapon];
    return (f.attack * 1.5 * weapon.damage + f.defense * 0.8 + f.speed * 0.45 + f.maxHealth * 0.2)
      * (0.75 + f.wins / (f.wins + f.losses)) * (0.9 + form * 0.045)
      * (1 + f.streak * 0.025) * Math.max(0.7, 1 - f.recentDeaths * 0.025) * (0.8 + (f.health / f.maxHealth) * 0.2)
      * (f.class === arena.favored ? 1.12 : 1) * (1 + f.critical + weapon.critical);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  fighters.forEach((f, i) => { f.odds = Math.round(Math.min(CONFIG.odds.max, Math.max(CONFIG.odds.min, CONFIG.economy.houseFactor * total / weights[i])) * 100) / 100; });
}
export function quotedOdds(base: number, event: RoundEvent): number {
  return Math.round(base * (event === 'DOUBLE REWARDS' ? 2 : event === 'UNDERDOG BONUS' && base >= 8 ? 1.5 : 1) * 100) / 100;
}
export function validateWager(amount: number, balance: number): string | null {
  if (!Number.isFinite(amount) || Math.abs(amount - roundMoney(amount)) > 1e-8) return 'Enter a dollar amount with at most two decimal places.';
  if (amount < CONFIG.economy.minWager) return `Minimum prediction is ${money(CONFIG.economy.minWager)}.`;
  if (amount > CONFIG.economy.maxWager) return `Maximum prediction is ${money(CONFIG.economy.maxWager)}.`;
  if (amount > balance) return 'Not enough in-game credits.';
  return null;
}
export function settlePrediction(save: SaveData, prediction: Prediction, won: boolean): number {
  if (prediction.status !== 'pending') return 0;
  prediction.status = won ? 'won' : 'lost';
  prediction.payout = won ? payoutFor(prediction.amount, prediction.odds) : 0;
  save.balance = roundMoney(save.balance + prediction.payout);
  save.totalWon = roundMoney(save.totalWon + prediction.payout);
  if (prediction.payout) save.transactions.unshift({ id: `payout-${prediction.id}`, label: `${prediction.fighterName} · round ${prediction.round} payout`, amount: prediction.payout, time: Date.now() });
  return prediction.payout;
}
