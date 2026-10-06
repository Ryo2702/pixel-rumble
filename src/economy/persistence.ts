import { CONFIG, DEFAULT_SETTINGS } from '../config/game';
import type { SaveData, Settings } from '../types';
import { GAME_CURRENCY, SOL_CENTI_LAMPORTS } from './currency';
import { emptyLiveStats, validLiveRecord, validLiveStats } from '../predictions/predictionHistory';

export interface PersistenceAdapter { load(): unknown; save(data: SaveData): void; }
export const localAdapter: PersistenceAdapter = {
  load: () => JSON.parse(localStorage.getItem('pixel-rumble-v3') || 'null') as unknown,
  save: data => localStorage.setItem('pixel-rumble-v3', JSON.stringify(data)),
};
export const freshSave = (): SaveData => ({ version: 3, balance: CONFIG.economy.startingBalance, predictions: [], transactions: [{ id: 'welcome', label: 'Welcome to the rumble · SIMULATED SOL', amount: CONFIG.economy.startingBalance, time: Date.now() }], settings: { ...DEFAULT_SETTINGS }, liveStats: emptyLiveStats(), liveHistory: [], liveOpenBets: [], discoveries: [], achievements: [], roundsWatched: 0, totalWon: 0 });
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const amount = (x: unknown, allowNegative = false): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x % SOL_CENTI_LAMPORTS === 0 && (allowNegative || x >= 0);
export function loadSave(adapter: PersistenceAdapter): SaveData {
  try {
    const value = adapter.load() as (Omit<Partial<SaveData>, 'version'> & { version?: number }) | null;
    if (!value || value.version !== 3 || !amount(value.balance)) return freshSave();
    const save = freshSave();
    save.balance = value.balance;
    if (value.community && typeof value.community === 'object' && value.community.currency === GAME_CURRENCY.ticker) save.community = value.community;
    save.roundsWatched = finite(value.roundsWatched) ? Math.max(0, Math.floor(value.roundsWatched)) : 0;
    save.totalWon = amount(value.totalWon) ? value.totalWon : 0;
    if (validLiveStats(value.liveStats)) save.liveStats = { ...value.liveStats };
    if (Array.isArray(value.liveHistory)) save.liveHistory = value.liveHistory.filter(validLiveRecord).slice(0, 100).map(record => ({ ...record }));
    if (Array.isArray(value.liveOpenBets)) save.liveOpenBets = value.liveOpenBets.filter(validLiveRecord).slice(0, 20).map(record => ({ ...record }));
    if (Array.isArray(value.predictions)) save.predictions = value.predictions.filter(p => p && typeof p.id === 'string' && typeof p.fighterId === 'string' && typeof p.fighterName === 'string' && Number.isSafeInteger(p.round) && p.round > 0 && amount(p.amount) && p.amount >= CONFIG.economy.minWager && p.amount <= CONFIG.economy.maxWager && finite(p.odds) && p.odds >= 1 && amount(p.payout) && finite(p.createdAt) && ['winner', 'team', 'damage', 'survival'].includes(p.type) && ['pending', 'won', 'lost'].includes(p.status)).slice(0, 100);
    if (Array.isArray(value.transactions)) save.transactions = value.transactions.filter(t => t && typeof t.id === 'string' && amount(t.amount, true) && finite(t.time) && typeof t.label === 'string').slice(0, 100);
    if (Array.isArray(value.discoveries)) save.discoveries = value.discoveries.filter(v => typeof v === 'string');
    if (Array.isArray(value.achievements)) save.achievements = value.achievements.filter(v => typeof v === 'string');
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      const v = value.settings?.[key];
      if (typeof v === 'boolean' && typeof save.settings[key] === 'boolean') Object.assign(save.settings, { [key]: v });
      if (finite(v) && typeof save.settings[key] === 'number') Object.assign(save.settings, { [key]: Math.min(1, Math.max(0, v)) });
    }
    // Reload interrupts the local game: refund only unsettled predictions once.
    for (const p of save.predictions.filter(p => p.status === 'pending')) {
      save.balance += p.amount;
      save.transactions.unshift({ id: `refund-${p.id}`, label: `Interrupted round ${p.round} refunded`, amount: p.amount, time: Date.now() });
    }
    save.predictions = save.predictions.filter(p => p.status !== 'pending');
    const refundedLive = new Set<string>();
    for (const bet of save.liveOpenBets) if ((bet.status === 'OPEN' || bet.status === 'LOCKED') && !refundedLive.has(bet.id)) {
      save.balance += bet.stake; refundedLive.add(bet.id);
      save.transactions.unshift({ id: `refund-${bet.id}`, label: `Interrupted live prediction refunded`, amount: bet.stake, time: Date.now() });
    }
    save.liveOpenBets = [];
    return save;
  } catch { return freshSave(); }
}
