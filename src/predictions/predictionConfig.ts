import { BET_LIMITS } from '../economy/currency';

export const LIVE_PREDICTION_CONFIG = {
  minBet: BET_LIMITS.min,
  maxBet: BET_LIMITS.max,
  windows: [10, 15, 20] as const,
  oddsRefreshSeconds: 1,
  audienceTickSeconds: 0.75,
  maxVisible: 2,
  resultHoldSeconds: 4,
  maxHistory: 100,
  maxActivity: 18,
} as const;
