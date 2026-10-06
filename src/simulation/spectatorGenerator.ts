import { AUDIENCE } from '../config/audience';
import { FIGHTERS } from '../config/game';
import { payoutFor, roundMoney } from '../economy/money';
import { emptyStats, periodKeys, validPeriod, validStats } from './leaderboardEngine';
import type { BettingStats, Spectator } from './types';

export class SeededRandom {
  constructor(public state: number) {}
  next = () => { this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0; return this.state / 4294967296; };
}
export function createUser(now: number): Spectator {
  const keys = periodKeys(now);
  return { ...emptyStats(), id: 'you', username: 'YOU', avatar: '#d6f65c', balance: 0, personality: 'random', favoriteFighter: 'byte', today: { ...emptyStats(), key: keys.today }, week: { ...emptyStats(), key: keys.week } };
}
function syntheticStats(bets: number, stake: number, favorite: string, random: () => number): BettingStats {
  const stats = emptyStats();
  for (let i = 0; i < bets; i++) {
    const amount = Math.round(stake * (0.3 + random())), win = random() < 0.17, paid = win ? payoutFor(amount, 3 + random() * 6) : 0;
    stats.totalBets++; stats.wins += Number(win); stats.losses += Number(!win);
    stats.profit = roundMoney(stats.profit + paid - amount); stats.lostAmount += win ? 0 : amount;
    stats.streak = win ? stats.streak + 1 : 0; stats.biggestWin = Math.max(stats.biggestWin, paid);
  }
  stats.favorites[favorite] = bets;
  return stats;
}
function sumStats(a: BettingStats, b: BettingStats): BettingStats {
  return { totalBets: a.totalBets + b.totalBets, wins: a.wins + b.wins, losses: a.losses + b.losses, profit: roundMoney(a.profit + b.profit), lostAmount: roundMoney(a.lostAmount + b.lostAmount), biggestWin: Math.max(a.biggestWin, b.biggestWin), streak: b.totalBets ? b.streak : a.streak, favorites: Object.fromEntries([...new Set([...Object.keys(a.favorites), ...Object.keys(b.favorites)])].map(k => [k, (a.favorites[k] || 0) + (b.favorites[k] || 0)])) };
}
export function generateSpectators(random: () => number, now: number, population = AUDIENCE.population): Spectator[] {
  const keys = periodKeys(now);
  return Array.from({ length: population }, (_, i) => {
    const personality = AUDIENCE.personalities[Math.floor(random() * AUDIENCE.personalities.length)];
    const favoriteFighter = FIGHTERS[Math.floor(random() * FIGHTERS.length)].id;
    const stem = `${AUDIENCE.prefixes[i % AUDIENCE.prefixes.length]}${AUDIENCE.suffixes[Math.floor(i / AUDIENCE.prefixes.length) % AUDIENCE.suffixes.length]}`;
    const username = AUDIENCE.knownNames[i] ?? `${stem}${String(Math.floor(i / (AUDIENCE.prefixes.length * AUDIENCE.suffixes.length)) + 10).padStart(2, '0')}`;
    const stake = personality === 'high-roller' ? 3600 : 100 + random() * 700;
    const today = syntheticStats(2 + Math.floor(random() * 12), stake, favoriteFighter, random);
    const week = sumStats(syntheticStats(10 + Math.floor(random() * 30), stake, favoriteFighter, random), today);
    const all = sumStats(syntheticStats(40 + Math.floor(random() * 120), stake, favoriteFighter, random), week);
    return { ...all, id: `spectator-${i}`, username, avatar: AUDIENCE.colors[i % AUDIENCE.colors.length], personality, favoriteFighter, balance: roundMoney(Math.max(1000, (personality === 'high-roller' ? 250000 : 20000) + all.profit)), today: { ...today, key: keys.today }, week: { ...week, key: keys.week } };
  });
}
export function validSpectator(value: unknown): value is Spectator {
  if (!validStats(value)) return false;
  const person = value as Spectator;
  return typeof person.id === 'string' && typeof person.username === 'string' && person.username.length <= 40 && /^#[\da-f]{6}$/i.test(person.avatar) && Number.isFinite(person.balance) && person.balance >= 0 && AUDIENCE.personalities.includes(person.personality) && typeof person.favoriteFighter === 'string' && validPeriod(person.today) && validPeriod(person.week);
}
