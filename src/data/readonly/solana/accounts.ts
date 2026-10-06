import { getSolBalance } from './balances';
import { getNetworkStatus, solanaRpc, type SolanaRpc } from './rpc';
import type { SolanaAccountInfo, SolanaBalance, SolanaNetworkStatus } from './types';
import { isSolanaAddress } from './validation';

export function getAccount(address: string, rpc: SolanaRpc = solanaRpc): Promise<{ context: { slot: number }; value: SolanaAccountInfo | null }> {
  if (!isSolanaAddress(address)) throw new Error('address is not a valid Solana address.');
  return rpc.getAccountInfo(address);
}

export function getBalance(address: string): Promise<SolanaBalance> {
  return getSolBalance(address);
}

export { getNetworkStatus };
export type { SolanaNetworkStatus };
