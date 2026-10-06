export type LivePredictionKind =
  | 'next_kill'
  | 'next_death'
  | 'next_critical'
  | 'next_respawn'
  | 'damage_leader'
  | 'death_window'
  | 'survive_window'
  | 'streak_target'
  | 'round_winner';

export type BattleEventType = 'FIGHTER_DAMAGED' | 'FIGHTER_KILLED' | 'FIGHTER_RESPAWNED' | 'CRITICAL_HIT' | 'STREAK_CHANGED' | 'ROUND_STARTED' | 'ROUND_ENDING' | 'ROUND_ENDED' | 'SPECIAL_ATTACK' | 'HAZARD_TRIGGERED';

export interface BattleEvent {
  type: BattleEventType;
  round: number;
  time: number;
  fighterId?: string;
  targetId?: string;
  amount?: number;
  health?: number;
  streak?: number;
  winnerId?: string;
}

export type LiveMarketStatus = 'OPEN' | 'LOCKED' | 'RESOLVED';
export type LiveBetStatus = 'OPEN' | 'LOCKED' | 'WON' | 'LOST' | 'PUSH' | 'VOID' | 'EXPIRED';

export interface LiveSelection {
  id: string;
  label: string;
  fighterId?: string;
  color: string;
  odds: number;
}

export interface LivePredictionMarket {
  id: string;
  round: number;
  kind: LivePredictionKind;
  question: string;
  selections: LiveSelection[];
  status: LiveMarketStatus;
  openedAt: number;
  closesAt: number;
  windowSeconds: number;
  subjectId?: string;
  subjectName?: string;
  targetStreak?: number;
  baselineDamage?: Record<string, number>;
  outcomeSelectionId?: string;
  outcomeLabel?: string;
  resolvedAt?: number;
}

export interface LivePredictionBet {
  id: string;
  predictionId: string;
  round: number;
  kind: LivePredictionKind;
  question: string;
  selectionId: string;
  selectionLabel: string;
  stake: number;
  lockedOdds: number;
  placedAt: number;
  status: LiveBetStatus;
  payout: number;
  resolvedAt?: number;
}

export interface LivePredictionRecord extends LivePredictionBet {
  profit: number;
}

export type LivePredictionHistory = LivePredictionRecord;

export interface LivePredictionStats {
  total: number;
  won: number;
  lost: number;
  push: number;
  voided: number;
  expired: number;
  profit: number;
  currentStreak: number;
  bestStreak: number;
  biggestWin: number;
}

export interface LiveAudienceBet {
  id: string;
  predictionId: string;
  username: string;
  avatar: string;
  selectionId: string;
  selectionLabel: string;
  amount: number;
  odds: number;
  status: LiveBetStatus;
  payout: number;
  placedAt: number;
}

export interface LiveCrowdShare {
  selectionId: string;
  label: string;
  color: string;
  amount: number;
  count: number;
  percent: number;
}

export interface LivePredictionActivity {
  id: number;
  text: string;
  detail: string;
  color: string;
  time: number;
}

export interface LiveMarketSnapshot extends LivePredictionMarket {
  secondsRemaining: number;
  userBet?: LivePredictionBet;
  audienceCount: number;
  audienceTotal: number;
  distribution: LiveCrowdShare[];
}

export interface LiveLeaderboardEntry extends LivePredictionStats {
  id: string;
  username: string;
  avatar: string;
  rank: number;
  winRate: number;
  isUser: boolean;
}

export interface LivePredictionSnapshot {
  markets: LiveMarketSnapshot[];
  recentActivity: LivePredictionActivity[];
  distribution: LiveCrowdShare[];
  predictionCount: number;
  totalStaked: number;
  stats: LivePredictionStats;
  leaderboard: LiveLeaderboardEntry[];
  latestResult: LivePredictionRecord | null;
}
