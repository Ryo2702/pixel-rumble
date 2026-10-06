import { solanaRpc, type SolanaRpc } from './rpc';
import type { SolanaBalance, SolanaTokenAccount } from './types';
import { isSolanaAddress, safeRpcNumber } from './validation';
import { normalizeTokenAccounts } from './rpc';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from './types';

export const LAMPORTS_PER_SOL = 1_000_000_000;

export async function getSolBalance(address: string, rpc: SolanaRpc = solanaRpc): Promise<SolanaBalance> {
  if (!isSolanaAddress(address)) throw new Error('address is not a valid Solana address.');
  const response = await rpc.getBalance(address);
  const lamports = safeRpcNumber(response?.value);
  const slot = safeRpcNumber(response?.context?.slot);
  if (lamports === null || slot === null) throw new Error('Solana returned an invalid balance.');
  return { address, lamports, sol: lamports / LAMPORTS_PER_SOL, slot, checkedAt: Date.now() };
}

export async function getTokenAccounts(owner: string, mint?: string, rpc: SolanaRpc = solanaRpc): Promise<SolanaTokenAccount[]> {
  if (!isSolanaAddress(owner)) throw new Error('owner is not a valid Solana address.');
  if (mint && !isSolanaAddress(mint)) throw new Error('mint is not a valid Solana address.');
  if (mint) return normalizeTokenAccounts(await rpc.getTokenAccountsByOwner(owner, mint));
  const results = await Promise.allSettled([
    rpc.getTokenAccountsByOwner(owner, undefined, TOKEN_PROGRAM_ID),
    rpc.getTokenAccountsByOwner(owner, undefined, TOKEN_2022_PROGRAM_ID),
  ]);
  const accounts = results.flatMap(result => result.status === 'fulfilled' ? normalizeTokenAccounts(result.value) : []);
  if (results.every(result => result.status === 'rejected')) throw results[0].status === 'rejected' ? results[0].reason : new Error('Solana token accounts are unavailable.');
  return accounts;
}
