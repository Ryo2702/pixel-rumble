import { roundMoney } from '../economy/money';
import type { AudienceBet, BettingStats, LeaderboardEntry, LeaderboardMetric, PeriodStats, Spectator, TimeFilter } from './types';

export const emptyStats = (): BettingStats => ({ totalBets: 0, wins: 0, losses: 0, profit: 0, biggestWin: 0, streak: 0, lostAmount: 0, favorites: {} });
export function periodKeys(now: number) {
  const date = new Date(now), day = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return { today: day, week: date.toISOString().slice(0, 10) };
}
export function currentPeriods(person: Spectator, now: number) {
  const keys = periodKeys(now);
  for (const period of ['today', 'week'] as const) if (person[period].key !== keys[period]) person[period] = { ...emptyStats(), key: keys[period] };
}
export function recordResult(person: Spectator, bet: AudienceBet, now: number) {
  currentPeriods(person, now);
  for (const stats of [person, person.today, person.week]) {
    stats.totalBets++; stats.wins += Number(bet.status === 'won'); stats.losses += Number(bet.status === 'lost');
    stats.profit = roundMoney(stats.profit + bet.payout - bet.amount);
    stats.lostAmount = roundMoney(stats.lostAmount + (bet.status === 'lost' ? bet.amount : 0));
    stats.biggestWin = Math.max(stats.biggestWin, bet.payout);
    stats.streak = bet.status === 'won' ? stats.streak + 1 : 0;
    stats.favorites[bet.fighterId] = (stats.favorites[bet.fighterId] || 0) + 1;
  }
  person.favoriteFighter = favorite(person);
}
function favorite(stats: BettingStats) { return Object.entries(stats.favorites).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'byte'; }
function periodStats(person: Spectator, time: TimeFilter, now: number): BettingStats {
  if (time === 'all') return person;
  return person[time].key === periodKeys(now)[time === 'today' ? 'today' : 'week'] ? person[time] : emptyStats();
}
export function rankSpectators(people: Spectator[], user: Spectator, metric: LeaderboardMetric, time: TimeFilter, now: number): { rows: LeaderboardEntry[]; user: LeaderboardEntry } {
  const ranked = [...people, user].map(person => {
    const stats = periodStats(person, time, now);
    return { ...stats, id: person.id, username: person.username, avatar: person.avatar, rank: 0, winRate: stats.totalBets ? stats.wins / stats.totalBets * 100 : 0, favoriteFighter: stats.totalBets ? favorite(stats) : person.favoriteFighter, isUser: person.id === 'you' };
  }).sort((a, b) => {
    const score = (entry: LeaderboardEntry) => metric === 'losses' ? entry.lostAmount : entry[metric];
    return score(b) - score(a) || b.totalBets - a.totalBets || a.id.localeCompare(b.id);
  });
  ranked.forEach((person, index) => { person.rank = index + 1; });
  return { rows: ranked.slice(0, 50), user: ranked.find(person => person.isUser)! };
}
export function validStats(value: unknown): value is BettingStats {
  if (!value || typeof value !== 'object') return false;
  const s = value as BettingStats;
  return ['totalBets', 'wins', 'losses', 'biggestWin', 'streak', 'lostAmount'].every(k => typeof s[k as keyof BettingStats] === 'number' && Number.isFinite(s[k as keyof BettingStats]) && Number(s[k as keyof BettingStats]) >= 0)
    && Number.isFinite(s.profit) && s.totalBets === s.wins + s.losses && !!s.favorites && typeof s.favorites === 'object' && !Array.isArray(s.favorites) && Object.values(s.favorites).every(v => Number.isSafeInteger(v) && v >= 0);
}
export function validPeriod(value: unknown): value is PeriodStats { return validStats(value) && typeof (value as PeriodStats).key === 'string'; }
