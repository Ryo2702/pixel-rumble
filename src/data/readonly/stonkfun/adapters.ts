import { STONKFUN_API } from './client';
import { StonkFunValidationError } from './errors';
import { isSolanaAddress } from '../solana/validation';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '../solana/types';
import { SOLANA_NETWORK } from './types';
import type { LaunchablePair, NormalizedPairs, NormalizedTokens, StonkFunMarketFields, StonkFunQuote, StonkFunToken } from './types';

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null;
}

function text(value: unknown, field: string, maxLength = 160): string {
  if (typeof value !== 'string') throw new StonkFunValidationError(`${field} must be a string.`);
  const result = value.trim();
  if (!result || result.length > maxLength || /[\u0000-\u001f<>]/.test(result)) throw new StonkFunValidationError(`${field} is empty, unsafe, or too long.`);
  return result;
}

function optionalText(value: unknown, maxLength = 160): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value !== 'string') return undefined;
  const result = value.trim();
  return result && result.length <= maxLength ? result : undefined;
}

function identifier(value: unknown, field: string): string {
  const result = text(value, field, 128);
  if (!isSolanaAddress(result)) throw new StonkFunValidationError(`${field} is not a valid Solana address.`);
  return result;
}

function tokenProgram(value: unknown, field: string): string {
  const result = identifier(value, field);
  if (result !== TOKEN_PROGRAM_ID && result !== TOKEN_2022_PROGRAM_ID) throw new StonkFunValidationError(`${field} is not an SPL token program.`);
  return result;
}

function symbol(value: unknown, field: string): string {
  const result = text(value, field, 32);
  if (!/^[A-Za-z0-9$._-]+$/.test(result)) throw new StonkFunValidationError(`${field} contains unsupported characters.`);
  return result;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function requiredNumber(value: unknown, field: string): number {
  const result = numberValue(value);
  if (result === undefined) throw new StonkFunValidationError(`${field} must be a finite non-negative number.`);
  return result;
}

function decimals(value: unknown, field: string): number {
  const result = requiredNumber(value, field);
  if (!Number.isInteger(result) || result > 255) throw new StonkFunValidationError(`${field} must be an integer from 0 to 255.`);
  return result;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new StonkFunValidationError(`${field} must be a boolean.`);
  return value;
}

function url(value: unknown): string | undefined {
  const result = optionalText(value, 2048);
  if (!result) return undefined;
  try {
    const parsed = new URL(result, STONKFUN_API);
    return parsed.protocol === 'https:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

function timestamp(value: unknown, field: string): string {
  const result = text(value, field, 64);
  if (!Number.isFinite(Date.parse(result))) throw new StonkFunValidationError(`${field} must be a valid timestamp.`);
  return result;
}

function market(value: unknown): StonkFunMarketFields {
  const source = record(value);
  if (!source) return {};
  return {
    priceUsd: numberValue(source.priceUsd),
    marketCapUsd: numberValue(source.marketCapUsd),
    fdvUsd: numberValue(source.fdvUsd),
    volume24hUsd: numberValue(source.volume24hUsd),
    liquidityUsd: numberValue(source.liquidityUsd),
    peakMarketCapUsd: numberValue(source.peakMarketCapUsd),
  };
}

function quote(value: unknown): StonkFunQuote {
  const source = record(value);
  if (!source) throw new StonkFunValidationError('token.quote must be an object.');
  return {
    mint: identifier(source.mint, 'token.quote.mint'),
    symbol: symbol(source.symbol, 'token.quote.symbol'),
    name: text(source.name, 'token.quote.name'),
    logoUrl: url(source.logoUrl),
    category: optionalText(source.category, 64),
    categoryLabel: optionalText(source.categoryLabel, 64),
  };
}

function token(value: unknown): StonkFunToken | null {
  try {
    const source = record(value);
    if (!source) return null;
    const transferFee = record(source.transferFee);
    return {
      mint: identifier(source.mint, 'token.mint'),
      pool: identifier(source.pool, 'token.pool'),
      name: text(source.name, 'token.name'),
      symbol: symbol(source.symbol, 'token.symbol'),
      quote: quote(source.quote),
      launchpad: text(source.launchpad, 'token.launchpad', 64),
      mode: text(source.mode, 'token.mode', 64),
      quoteOnlyFees: booleanValue(source.quoteOnlyFees, 'token.quoteOnlyFees'),
      transferFee: transferFee && numberValue(transferFee.bps) !== undefined ? { bps: requiredNumber(transferFee.bps, 'token.transferFee.bps') } : undefined,
      imageUrl: url(source.imageUrl),
      links: record(source.links) ?? {},
      market: market(source.market),
      status: optionalText(source.status, 64),
      graduationProgress: numberValue(source.graduationProgress),
      createdAt: timestamp(source.createdAt, 'token.createdAt'),
    };
  } catch (error) {
    if (error instanceof StonkFunValidationError) return null;
    throw error;
  }
}

function responseData(value: unknown, field: string): RecordValue {
  const source = record(value);
  if (!source) throw new StonkFunValidationError(`${field} must be an object.`);
  return source;
}

function responseTimestamp(value: unknown): number {
  const result = timestamp(value, 'meta.generatedAt');
  return Date.parse(result);
}

export function normalizeTokens(value: unknown): NormalizedTokens {
  const source = responseData(value, 'response');
  const data = responseData(source.data, 'response.data');
  if (!Array.isArray(data.tokens)) throw new StonkFunValidationError('response.data.tokens must be an array.');
  const network = text(data.network, 'response.data.network', 64);
  if (network !== SOLANA_NETWORK) throw new StonkFunValidationError(`Only the Solana network (${SOLANA_NETWORK}) is supported.`);
  const generatedAt = responseTimestamp(responseData(source.meta, 'response.meta').generatedAt);
  const tokens = data.tokens.map(token).filter((item): item is StonkFunToken => item !== null).map(item => ({ ...item, market: item.market ?? {}, network: SOLANA_NETWORK, history: item.market?.priceUsd === undefined ? [] : [item.market.priceUsd] }));
  if (data.tokens.length > 0 && tokens.length === 0) throw new StonkFunValidationError('response.data.tokens contained no valid tokens.');
  return { tokens, generatedAt };
}

function pair(value: unknown): LaunchablePair | null {
  try {
    const source = record(value);
    if (!source || source.launchable !== true) return null;
    return {
      mint: identifier(source.mint, 'pair.mint'),
      symbol: symbol(source.symbol, 'pair.symbol'),
      name: text(source.name, 'pair.name'),
      decimals: decimals(source.decimals, 'pair.decimals'),
      logoUrl: url(source.logoUrl),
      category: text(source.category, 'pair.category', 64),
      categoryLabel: text(source.categoryLabel, 'pair.categoryLabel', 64),
      tokenProgram: tokenProgram(source.tokenProgram, 'pair.tokenProgram'),
      launchable: booleanValue(source.launchable, 'pair.launchable'),
      symbolAmbiguous: booleanValue(source.symbolAmbiguous, 'pair.symbolAmbiguous'),
      launchLabReady: booleanValue(source.launchLabReady, 'pair.launchLabReady'),
      communityMode: booleanValue(source.communityMode, 'pair.communityMode'),
    };
  } catch (error) {
    if (error instanceof StonkFunValidationError) return null;
    throw error;
  }
}

export function normalizePairs(value: unknown): NormalizedPairs {
  const source = responseData(value, 'response');
  const data = responseData(source.data, 'response.data');
  if (!Array.isArray(data.pairs)) throw new StonkFunValidationError('response.data.pairs must be an array.');
  if (data.selectBy !== 'mint') throw new StonkFunValidationError('response.data.selectBy must be mint.');
  const generatedAt = responseTimestamp(responseData(source.meta, 'response.meta').generatedAt);
  const pairs = data.pairs.map(pair).filter((item): item is LaunchablePair => item !== null);
  if (data.pairs.length > 0 && pairs.length === 0) throw new StonkFunValidationError('response.data.pairs contained no valid launchable pairs.');
  return { pairs, generatedAt };
}
