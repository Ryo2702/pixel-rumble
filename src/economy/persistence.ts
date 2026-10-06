import { CONFIG, DEFAULT_SETTINGS } from '../config/game';
import type { SaveData, Settings } from '../types';

export interface PersistenceAdapter { load(): unknown; save(data: SaveData): void; }
export const localAdapter: PersistenceAdapter = {
  load: () => JSON.parse(localStorage.getItem('pixel-rumble-v1') || 'null') as unknown,
  save: data => localStorage.setItem('pixel-rumble-v1', JSON.stringify(data)),
};
export const freshSave = (): SaveData => ({ version: 1, balance: CONFIG.economy.startingBalance, predictions: [], transactions: [{ id: 'welcome', label: 'Welcome to the rumble', amount: CONFIG.economy.startingBalance, time: Date.now() }], settings: { ...DEFAULT_SETTINGS }, discoveries: [], achievements: [], roundsWatched: 0, totalWon: 0 });
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
export function loadSave(adapter: PersistenceAdapter): SaveData {
  try {
    const value = adapter.load() as Partial<SaveData> | null;
    if (!value || value.version !== 1 || !finite(value.balance) || value.balance < 0) return freshSave();
    const save = freshSave();
    save.balance = value.balance;
    save.roundsWatched = finite(value.roundsWatched) ? Math.max(0, Math.floor(value.roundsWatched)) : 0;
    save.totalWon = finite(value.totalWon) ? Math.max(0, value.totalWon) : 0;
    if (Array.isArray(value.predictions)) save.predictions = value.predictions.filter(p => p && typeof p.id === 'string' && typeof p.fighterId === 'string' && typeof p.fighterName === 'string' && Number.isSafeInteger(p.round) && p.round > 0 && Number.isSafeInteger(p.amount) && p.amount > 0 && p.amount <= CONFIG.economy.maxWager && finite(p.odds) && p.odds >= 1 && finite(p.payout) && p.payout >= 0 && finite(p.createdAt) && ['winner', 'team', 'damage', 'survival'].includes(p.type) && ['pending', 'won', 'lost'].includes(p.status)).slice(0, 100);
    if (Array.isArray(value.transactions)) save.transactions = value.transactions.filter(t => t && typeof t.id === 'string' && finite(t.amount) && finite(t.time) && typeof t.label === 'string').slice(0, 100);
    if (Array.isArray(value.discoveries)) save.discoveries = value.discoveries.filter(v => typeof v === 'string');
    if (Array.isArray(value.achievements)) save.achievements = value.achievements.filter(v => typeof v === 'string');
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      const v = value.settings?.[key];
      if (typeof v === 'boolean' && typeof save.settings[key] === 'boolean') Object.assign(save.settings, { [key]: v });
      if (finite(v) && typeof save.settings[key] === 'number') Object.assign(save.settings, { [key]: Math.min(1, Math.max(0, v)) });
    }
    // Reload interrupts the local simulation: refund only unsettled predictions once.
    for (const p of save.predictions.filter(p => p.status === 'pending')) {
      save.balance += p.amount;
      save.transactions.unshift({ id: `refund-${p.id}`, label: `Interrupted round ${p.round} refunded`, amount: p.amount, time: Date.now() });
    }
    save.predictions = save.predictions.filter(p => p.status !== 'pending');
    return save;
  } catch { return freshSave(); }
}
