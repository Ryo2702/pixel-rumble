import type { Prediction, RoundEvent } from '../types';

export type Personality = 'conservative' | 'high-roller' | 'underdog' | 'trend' | 'random';
export type LeaderboardMetric = 'profit' | 'wins' | 'winRate' | 'biggestWin' | 'streak' | 'losses';
export type TimeFilter = 'today' | 'week' | 'all';
export interface BettingStats {
  totalBets: number; wins: number; losses: number; profit: number; biggestWin: number; streak: number;
  lostAmount: number; favorites: Record<string, number>;
}
export interface PeriodStats extends BettingStats { key: string; }
export interface Spectator extends BettingStats {
  id: string; username: string; avatar: string; balance: number; personality: Personality;
  favoriteFighter: string; today: PeriodStats; week: PeriodStats;
}
export interface AudienceBet extends Prediction { spectatorId: string; username: string; avatar: string; isUser: boolean; }
export interface CrowdShare { fighterId: string; name: string; color: string; amount: number; count: number; percent: number; }
export interface Reaction { id: number; username: string; avatar: string; text: string; kind: string; time: number; }
export interface RoundOutcomes { winner: string; team: string; damage: string; survival: string; }
export interface RoundResults {
  round: number; winnerId: string; winnerName: string; odds: number; winningBets: number; paid: number;
  winners: AudienceBet[]; biggestWin: AudienceBet | null; highestOdds: AudienceBet | null; biggestProfit: AudienceBet | null;
  user: AudienceBet | null;
}
export interface LeaderboardEntry extends BettingStats { id: string; username: string; avatar: string; rank: number; winRate: number; favoriteFighter: string; isUser: boolean; }
export interface AudienceSave {
  version: 1; currency: 'SOL'; rng: number; spectators: Spectator[]; user: Spectator; pending: AudienceBet[];
  watchers: number; lastSettledRound: number; results: RoundResults | null;
}
export interface AudienceSnapshot {
  watchers: number; betCount: number; totalBets: number; excitement: number; locked: boolean;
  recentBets: AudienceBet[]; distribution: CrowdShare[]; reactions: Reaction[]; results: RoundResults | null;
  leaders: LeaderboardEntry[]; userRank: LeaderboardEntry; revision: number;
}
export type AudienceSignal = { kind: 'open' | 'lock' | 'kill' | 'critical' | 'respawn' | 'streak' | 'upset' | 'winner' | 'boss' | 'sudden' | 'large-bet'; fighter?: string; victim?: string; odds?: number; amount?: number; event?: RoundEvent; };
