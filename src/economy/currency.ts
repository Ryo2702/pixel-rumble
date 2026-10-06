export const LAMPORTS_PER_SOL = 1_000_000_000;
export const SOL_CENTI_LAMPORTS = 10_000_000;

export const GAME_CURRENCY = {
  ticker: 'SOL',
  label: 'Simulated SOL',
  decimals: 2,
  minBet: 0.1,
  maxBet: 20,
  startingBalance: 84.5,
  spectatorReward: 0.15,
} as const;

export const BET_CONFIG = { minBet: GAME_CURRENCY.minBet, maxBet: GAME_CURRENCY.maxBet } as const;

export const BET_LIMITS = {
  min: solToLamports(BET_CONFIG.minBet),
  max: solToLamports(BET_CONFIG.maxBet),
} as const;

export function solToLamports(value: string | number): number {
  const text = typeof value === 'number' ? String(value) : value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) throw new Error('Invalid SOL amount.');
  const [whole, fraction = ''] = text.split('.');
  const units = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0');
  const lamports = units * BigInt(SOL_CENTI_LAMPORTS);
  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('SOL amount is too large.');
  return Number(lamports);
}

export function parseSOL(value: string): number | null {
  try { return solToLamports(value); } catch { return null; }
}

export function formatSOL(lamports: number): string {
  if (!Number.isSafeInteger(lamports) || lamports < 0) return 'N/A SOL';
  const cents = Math.floor(lamports / SOL_CENTI_LAMPORTS);
  return `${Math.floor(cents / 100).toLocaleString('en-US')}.${String(cents % 100).padStart(2, '0')} SOL`;
}

export function formatSOLInput(lamports: number): string {
  return formatSOL(lamports).replace(/ SOL$/, '');
}

export function signedSOL(lamports: number): string {
  return `${lamports >= 0 ? '+' : '−'}${formatSOL(Math.abs(lamports))}`;
}

export function payoutFor(stakeLamports: number, odds: number): number {
  const oddsBasisPoints = Math.round(odds * 100);
  if (!Number.isSafeInteger(stakeLamports) || stakeLamports < 0 || stakeLamports % SOL_CENTI_LAMPORTS !== 0) return 0;
  const payoutCenti = (BigInt(stakeLamports / SOL_CENTI_LAMPORTS) * BigInt(oddsBasisPoints) + 50n) / 100n;
  const payout = payoutCenti * BigInt(SOL_CENTI_LAMPORTS);
  return payout > BigInt(Number.MAX_SAFE_INTEGER) ? 0 : Number(payout);
}

export function profitFor(stakeLamports: number, odds: number): number {
  return payoutFor(stakeLamports, odds) - stakeLamports;
}

export function randomSOLAmount(minLamports: number, maxLamports: number, random = Math.random): number | null {
  const lower = Math.ceil(minLamports / SOL_CENTI_LAMPORTS) * SOL_CENTI_LAMPORTS;
  const upper = Math.floor(maxLamports / SOL_CENTI_LAMPORTS) * SOL_CENTI_LAMPORTS;
  if (!Number.isSafeInteger(lower) || !Number.isSafeInteger(upper) || upper < lower) return null;
  const steps = (upper - lower) / SOL_CENTI_LAMPORTS;
  return lower + Math.floor(Math.min(0.999999999999, Math.max(0, random())) * (steps + 1)) * SOL_CENTI_LAMPORTS;
}

export function generateRandomBet({ min = BET_CONFIG.minBet, max = BET_CONFIG.maxBet, balance }: { min?: number; max?: number; balance: number }): number | null {
  const minimum = solToLamports(min);
  const maximum = Math.min(solToLamports(max), balance);
  return randomSOLAmount(minimum, maximum);
}
