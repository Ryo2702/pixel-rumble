import { SOL_CENTI_LAMPORTS } from '../economy/currency';
import type { LiveBetStatus, LivePredictionRecord, LivePredictionStats } from './predictionTypes';

export const emptyLiveStats = (): LivePredictionStats => ({ total: 0, won: 0, lost: 0, push: 0, voided: 0, expired: 0, profit: 0, currentStreak: 0, bestStreak: 0, biggestWin: 0 });

export function recordLiveResult(stats: LivePredictionStats, record: LivePredictionRecord) {
  stats.total++;
  if (record.status === 'WON') { stats.won++; stats.currentStreak++; stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak); }
  else if (record.status === 'LOST') { stats.lost++; stats.currentStreak = 0; }
  else if (record.status === 'PUSH') stats.push++;
  else if (record.status === 'VOID') stats.voided++;
  else if (record.status === 'EXPIRED') stats.expired++;
  stats.profit += record.profit;
  stats.biggestWin = Math.max(stats.biggestWin, record.payout);
}

const statuses: LiveBetStatus[] = ['OPEN', 'LOCKED', 'WON', 'LOST', 'PUSH', 'VOID', 'EXPIRED'];
const integer = (value: unknown, allowNegative = false) => Number.isSafeInteger(value) && (allowNegative || Number(value) >= 0) && Number(value) % SOL_CENTI_LAMPORTS === 0;

export function validLiveStats(value: unknown): value is LivePredictionStats {
  if (!value || typeof value !== 'object') return false;
  const stats = value as LivePredictionStats;
  return ['total', 'won', 'lost', 'push', 'voided', 'expired', 'currentStreak', 'bestStreak'].every(key => Number.isSafeInteger(stats[key as keyof LivePredictionStats]) && Number(stats[key as keyof LivePredictionStats]) >= 0)
    && stats.total === stats.won + stats.lost + stats.push + stats.voided + stats.expired
    && integer(stats.profit, true) && integer(stats.biggestWin);
}

export function validLiveRecord(value: unknown): value is LivePredictionRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as LivePredictionRecord;
  return typeof record.id === 'string' && typeof record.predictionId === 'string' && Number.isSafeInteger(record.round) && record.round > 0
    && typeof record.kind === 'string' && typeof record.question === 'string' && typeof record.selectionId === 'string' && typeof record.selectionLabel === 'string'
    && integer(record.stake) && record.stake >= 0 && Number.isFinite(record.lockedOdds) && record.lockedOdds >= 1
    && Number.isFinite(record.placedAt) && statuses.includes(record.status) && integer(record.payout) && integer(record.profit, true)
    && (!record.resolvedAt || Number.isFinite(record.resolvedAt));
}
