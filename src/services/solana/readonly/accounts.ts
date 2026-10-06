import { isSolanaAddress } from '../../../data/readonly/solana/validation';
import { solanaRpc } from './rpc';
import { LAMPORTS_PER_SOL, type RpcContext, type SolanaAccountInfo, type SolanaAddressSnapshot } from './types';

type BalanceResponse = { context: RpcContext; value: number };
type AccountResponse = { context: RpcContext; value: SolanaAccountInfo | null };

function requireAddress(address: string) {
  if (!isSolanaAddress(address)) throw new Error('Enter a valid Solana public address.');
}

function integer(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) throw new Error(`Solana returned an invalid ${field}.`);
  return value;
}

export async function readAddress(address: string): Promise<SolanaAddressSnapshot> {
  requireAddress(address);
  const [balance, account] = await Promise.all([
    solanaRpc<BalanceResponse>('getBalance', [address, { commitment: 'confirmed' }]),
    solanaRpc<AccountResponse>('getAccountInfo', [address, { commitment: 'confirmed', encoding: 'jsonParsed' }]),
  ]);
  const value = account.value;
  const lamports = integer(balance.value, 'balance');
  const slot = Math.max(integer(balance.context.slot, 'balance slot'), integer(account.context.slot, 'account slot'));
  return {
    address,
    lamports,
    sol: lamports / LAMPORTS_PER_SOL,
    owner: value?.owner ?? null,
    executable: value?.executable ?? null,
    accountExists: value !== null,
    slot,
  };
}
