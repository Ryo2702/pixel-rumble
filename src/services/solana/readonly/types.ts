export const SOLANA_MAINNET_LABEL = 'SOLANA MAINNET' as const;
export const LAMPORTS_PER_SOL = 1_000_000_000;

export type JsonRpcResponse<T> = {
  jsonrpc: '2.0';
  result?: T;
  error?: { code: number; message: string };
  id: number;
};

export interface RpcContext {
  slot: number;
}

export interface SolanaSupplyValue {
  total: number;
  circulating: number;
  nonCirculating: number;
}

export interface SolanaNetworkSnapshot {
  slot: number;
  blockHeight: number;
  epoch: number;
  transactionCount: number;
  version: string;
  totalLamports: number;
  circulatingLamports: number;
  nonCirculatingLamports: number;
}

export interface SolanaAccountInfo {
  owner: string;
  executable: boolean;
  lamports: number;
  data?: unknown;
}

export interface SolanaAddressSnapshot {
  address: string;
  lamports: number;
  sol: number;
  owner: string | null;
  executable: boolean | null;
  accountExists: boolean;
  slot: number;
}

export interface SolanaTokenSnapshot {
  mint: string;
  amount: string;
  uiAmountString: string;
  decimals: number;
  owner: string | null;
  executable: boolean | null;
  accountExists: boolean;
  verified: boolean;
  slot: number;
}

export type LookupStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LookupState<T> {
  status: LookupStatus;
  data: T | null;
  error: string | null;
}

export interface SolanaReadState {
  status: 'loading' | 'ready' | 'error';
  refreshing: boolean;
  network: SolanaNetworkSnapshot | null;
  lastUpdated: number | null;
  error: string | null;
  address: LookupState<SolanaAddressSnapshot>;
  token: LookupState<SolanaTokenSnapshot>;
  refresh: () => Promise<void>;
  lookupAddress: (address: string) => Promise<void>;
  lookupToken: (mint: string) => Promise<void>;
}
