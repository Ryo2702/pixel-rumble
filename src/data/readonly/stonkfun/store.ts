import { useEffect, useSyncExternalStore } from 'react';
import { verifyTokenMints } from '../solana/tokens';
import { getLaunchablePairs } from './pairs';
import { StonkFunError } from './errors';
import { normalizePairs, normalizeTokens } from './adapters';
import { getNewestTokens } from './tokens';
import type { SolanaTokenVerification } from '../solana/types';
import type { LaunchablePair, MarketToken } from './types';

export const MARKET_CONFIG = { refreshInterval: 30_000 } as const;

export interface StonkFunMarketState {
  status: 'loading' | 'ready' | 'error';
  refreshing: boolean;
  tokens: MarketToken[];
  pairs: LaunchablePair[];
  lastUpdated: number | null;
  error: string | null;
  tokensError: string | null;
  pairsError: string | null;
  refresh: () => Promise<void>;
}

const initialState: Omit<StonkFunMarketState, 'refresh'> = { status: 'loading', refreshing: false, tokens: [], pairs: [], lastUpdated: null, error: null, tokensError: null, pairsError: null };

function errorMessage(value: unknown, fallback: string) {
  return value instanceof StonkFunError || value instanceof Error ? value.message : fallback;
}

class StonkFunMarketStore {
  private state: StonkFunMarketState = { ...initialState, refresh: () => this.refresh() };
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getSnapshot = () => this.state;

  start() {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => { void this.refresh(); }, MARKET_CONFIG.refreshInterval);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  refresh = async () => {
    if (this.inFlight) return;
    this.inFlight = true;
    this.setState({ ...this.state, refreshing: true, status: this.state.tokens.length || this.state.pairs.length ? 'ready' : 'loading' });
    const [tokensResult, pairsResult] = await Promise.allSettled([getNewestTokens(), getLaunchablePairs()]);
    let tokensResponse: ReturnType<typeof normalizeTokens> | null = null;
    let pairsResponse: ReturnType<typeof normalizePairs> | null = null;
    let tokensError = tokensResult.status === 'rejected' ? errorMessage(tokensResult.reason, 'Token data is unavailable.') : null;
    let pairsError = pairsResult.status === 'rejected' ? errorMessage(pairsResult.reason, 'Launchable pairs are unavailable.') : null;
    if (tokensResult.status === 'fulfilled') {
      try { tokensResponse = normalizeTokens(tokensResult.value); } catch (error) { tokensError = errorMessage(error, 'Token data is invalid.'); }
    }
    if (pairsResult.status === 'fulfilled') {
      try { pairsResponse = normalizePairs(pairsResult.value); } catch (error) { pairsError = errorMessage(error, 'Launchable pairs are invalid.'); }
    }
    const tokens = tokensResponse ? this.mergeTokens(tokensResponse.tokens) : this.state.tokens;
    const pairs = pairsResponse ? pairsResponse.pairs : this.state.pairs;
    const verification = tokensResponse || pairsResponse ? await verifyTokenMints([...tokens, ...pairs].map(item => item.mint)).catch(() => new Map<string, SolanaTokenVerification>()) : new Map<string, SolanaTokenVerification>();
    const verifiedTokens = tokens.map(token => ({ ...token, onChain: verification.get(token.mint) ?? token.onChain }));
    const verifiedPairs = pairs.map(pair => ({ ...pair, onChain: verification.get(pair.mint) ?? pair.onChain }));
    const lastUpdated = Math.max(tokensResponse?.generatedAt ?? 0, pairsResponse?.generatedAt ?? 0) || this.state.lastUpdated;
    const hasData = verifiedTokens.length > 0 || verifiedPairs.length > 0;
    this.setState({ status: hasData ? 'ready' : 'error', refreshing: false, tokens: verifiedTokens, pairs: verifiedPairs, lastUpdated, tokensError, pairsError, error: hasData ? null : tokensError ?? pairsError ?? 'Crypto market data is unavailable.', refresh: this.refresh });
    this.inFlight = false;
  };

  private mergeTokens(incoming: MarketToken[]) {
    const previous = new Map(this.state.tokens.map(token => [token.mint, token]));
    return incoming.map(token => {
      const oldToken = previous.get(token.mint);
      const oldPrice = oldToken?.market?.priceUsd;
      const price = token.market?.priceUsd;
      const history = oldToken?.history ? [...oldToken.history] : [...token.history];
      if (price !== undefined && price !== oldPrice) history.push(price);
      const changePercent = oldPrice && price !== undefined ? (price / oldPrice - 1) * 100 : undefined;
      return { ...token, history: history.slice(-40), changePercent };
    });
  }

  private setState(state: StonkFunMarketState) {
    this.state = state;
    this.listeners.forEach(listener => listener());
  }
}

export const stonkFunMarketStore = new StonkFunMarketStore();

export function useStonkFunMarket() {
  const state = useSyncExternalStore(stonkFunMarketStore.subscribe, stonkFunMarketStore.getSnapshot, stonkFunMarketStore.getSnapshot);
  useEffect(() => { stonkFunMarketStore.start(); return () => stonkFunMarketStore.stop(); }, []);
  return state;
}
