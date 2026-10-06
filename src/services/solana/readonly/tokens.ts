import { isSolanaAddress } from '../../../data/readonly/solana/validation';
import { solanaRpc } from './rpc';
import type { RpcContext, SolanaAccountInfo, SolanaTokenSnapshot } from './types';

type TokenSupplyResponse = {
  context: RpcContext;
  value: { amount: string; decimals: number; uiAmountString: string };
};
type AccountResponse = { context: RpcContext; value: SolanaAccountInfo | null };

function requireMint(mint: string) {
  if (!isSolanaAddress(mint)) throw new Error('Enter a valid SPL token mint address.');
}

export async function readTokenMint(mint: string): Promise<SolanaTokenSnapshot> {
  requireMint(mint);
  const [supply, account] = await Promise.all([
    solanaRpc<TokenSupplyResponse>('getTokenSupply', [mint, { commitment: 'confirmed' }]),
    solanaRpc<AccountResponse>('getAccountInfo', [mint, { commitment: 'confirmed', encoding: 'jsonParsed' }]),
  ]);
  const value = account.value;
  if (!supply.value || typeof supply.value.amount !== 'string' || typeof supply.value.uiAmountString !== 'string' || !Number.isInteger(supply.value.decimals) || supply.value.decimals < 0) throw new Error('Solana returned invalid token supply data.');
  const slot = Math.max(supply.context.slot, account.context.slot);
  if (!Number.isInteger(slot) || slot < 0) throw new Error('Solana returned an invalid token slot.');
  return {
    mint,
    amount: supply.value.amount,
    uiAmountString: supply.value.uiAmountString,
    decimals: supply.value.decimals,
    owner: value?.owner ?? null,
    executable: value?.executable ?? null,
    accountExists: value !== null,
    verified: value !== null,
    slot,
  };
}
