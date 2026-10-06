export const SOLANA_NETWORK = 'mainnet-beta' as const;
export const SOLANA_MAINNET_LABEL = 'SOLANA MAINNET' as const;
export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as const;
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as const;

export type SolanaOnChainStatus = 'verified' | 'unverified' | 'unavailable';
export type SolanaTokenProgram = 'spl-token' | 'token-2022' | 'unknown';

export interface SolanaTokenVerification {
  status: SolanaOnChainStatus;
  mint: string;
  accountExists: boolean;
  program: SolanaTokenProgram;
  decimals?: number;
  supplyRaw?: string;
  slot?: number;
  checkedAt: number;
  error?: string;
}

export interface SolanaRpcContext {
  slot: number;
  apiVersion?: string;
}

export type SolanaAccountData = [string, 'base64'] | [unknown, 'jsonParsed'];

export interface SolanaAccountInfo {
  data: SolanaAccountData;
  executable: boolean;
  lamports: number;
  owner: string;
  rentEpoch?: number;
}

export interface SolanaTokenMintData {
  supplyRaw: string;
  decimals: number;
  initialized: boolean;
}

export interface SolanaBalance {
  address: string;
  lamports: number;
  sol: number;
  slot: number;
  checkedAt: number;
}

export interface SolanaNetworkStatus {
  slot: number;
  blockHeight: number;
  checkedAt: number;
}

export interface SolanaTokenAccount {
  address: string;
  mint: string;
  owner: string;
  amountRaw: string;
  decimals: number;
  uiAmount?: number;
  program: SolanaTokenProgram;
  state?: string;
}

export interface SolanaSignatureStatus {
  signature: string;
  slot?: number;
  confirmations?: number | null;
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
  err: unknown | null;
}

export interface SolanaReadOnlyProvider {
  getAccount(address: string): Promise<{ context: SolanaRpcContext; value: SolanaAccountInfo | null }>;
  getBalance(address: string): Promise<SolanaBalance>;
  getTokenSupply(mint: string): Promise<SolanaTokenVerification>;
  getTransaction(signature: string): Promise<SolanaSignatureStatus | null>;
}
