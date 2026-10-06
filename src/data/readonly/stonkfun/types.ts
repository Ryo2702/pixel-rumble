import { SOLANA_NETWORK as SOLANA_MAINNET_NETWORK } from '../solana/types';
import type { SolanaTokenVerification } from '../solana/types';

export const SOLANA_NETWORK = SOLANA_MAINNET_NETWORK;

export interface StonkFunMarketFields {
  priceUsd?: number;
  marketCapUsd?: number;
  fdvUsd?: number;
  volume24hUsd?: number;
  liquidityUsd?: number;
  peakMarketCapUsd?: number;
}

export interface StonkFunQuote {
  mint: string;
  symbol: string;
  name: string;
  logoUrl?: string;
  category?: string;
  categoryLabel?: string;
}

export interface StonkFunToken {
  mint: string;
  pool: string;
  name: string;
  symbol: string;
  quote: StonkFunQuote;
  launchpad: string;
  mode: string;
  quoteOnlyFees: boolean;
  transferFee?: { bps: number };
  imageUrl?: string;
  links: Record<string, unknown>;
  market?: StonkFunMarketFields;
  status?: string;
  graduationProgress?: number;
  createdAt: string;
}

export interface StonkFunPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StonkFunTokensResponse {
  data: {
    tokens: StonkFunToken[];
    pagination: StonkFunPagination;
    network: string;
  };
  meta: { generatedAt: string };
}

export interface StonkFunPair {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  category: string;
  categoryLabel: string;
  tokenProgram: string;
  launchable: boolean;
  symbolAmbiguous: boolean;
  launchLabReady: boolean;
  communityMode: boolean;
}

export interface StonkFunPairsResponse {
  data: {
    pairs: StonkFunPair[];
    selectBy: 'mint';
    ambiguousSymbolCount: number;
  };
  meta: { generatedAt: string };
}

export interface MarketToken extends Omit<StonkFunToken, 'market'> {
  network: typeof SOLANA_NETWORK;
  market: StonkFunMarketFields;
  history: number[];
  changePercent?: number;
  onChain?: SolanaTokenVerification;
}

export interface LaunchablePair extends StonkFunPair {
  logoUrl?: string;
  onChain?: SolanaTokenVerification;
}

export interface NormalizedTokens {
  tokens: MarketToken[];
  generatedAt: number;
}

export interface NormalizedPairs {
  pairs: LaunchablePair[];
  generatedAt: number;
}
