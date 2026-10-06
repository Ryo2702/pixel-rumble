import { SolanaRpcClient, solanaRpcClient } from './client';
import type { SolanaAccountInfo, SolanaNetworkStatus, SolanaRpcContext, SolanaTokenAccount, SolanaTokenProgram } from './types';
import { isSolanaAddress, isSolanaSignature, safeRpcNumber } from './validation';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from './types';

type AccountResponse = { context: SolanaRpcContext; value: SolanaAccountInfo | null };
type MultipleAccountsResponse = { context: SolanaRpcContext; value: (SolanaAccountInfo | null)[] };
type BalanceResponse = { context: SolanaRpcContext; value: number };
type TokenAccountResponse = { context: SolanaRpcContext; value: Array<{ pubkey: string; account: { owner?: string; data: { parsed?: { info?: { mint?: string; owner?: string; tokenAmount?: { amount?: string; decimals?: number; uiAmount?: number | null } }; type?: string }; program?: string } } }> };

function requireAddress(address: string, field: string) {
  if (!isSolanaAddress(address)) throw new Error(`${field} is not a valid Solana address.`);
}

function program(value: unknown): SolanaTokenProgram {
  return value === TOKEN_PROGRAM_ID || value === 'spl-token' ? 'spl-token' : value === TOKEN_2022_PROGRAM_ID || value === 'spl-token-2022' ? 'token-2022' : 'unknown';
}

export class SolanaRpc {
  constructor(private readonly client: SolanaRpcClient = solanaRpcClient) {}

  getAccountInfo(address: string) {
    requireAddress(address, 'address');
    return this.client.read<AccountResponse>('getAccountInfo', [address, { encoding: 'base64' }]);
  }

  getMultipleAccounts(addresses: string[]) {
    addresses.forEach(address => requireAddress(address, 'address'));
    return this.client.read<MultipleAccountsResponse>('getMultipleAccounts', [addresses, { encoding: 'base64', commitment: 'confirmed' }]);
  }

  getBalance(address: string) {
    requireAddress(address, 'address');
    return this.client.read<BalanceResponse>('getBalance', [address, { commitment: 'confirmed' }]);
  }

  getSlot() {
    return this.client.read<number>('getSlot', [{ commitment: 'confirmed' }]);
  }

  getBlockHeight() {
    return this.client.read<number>('getBlockHeight', [{ commitment: 'confirmed' }]);
  }

  getSignatureStatuses(signatures: string[]) {
    signatures.forEach(signature => { if (!isSolanaSignature(signature)) throw new Error('signature is not a valid Solana transaction signature.'); });
    return this.client.read<{ value: Array<{ slot?: number; confirmations?: number | null; confirmationStatus?: 'processed' | 'confirmed' | 'finalized'; err: unknown | null } | null> }>('getSignatureStatuses', [signatures, { searchTransactionHistory: true }]);
  }

  getTokenAccountsByOwner(owner: string, mint?: string, programId: string = TOKEN_PROGRAM_ID) {
    requireAddress(owner, 'owner');
    if (mint) requireAddress(mint, 'mint');
    const filter = mint ? { mint } : { programId };
    return this.client.read<TokenAccountResponse>('getTokenAccountsByOwner', [owner, filter, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
  }
}

export const solanaRpc = new SolanaRpc();

export async function getNetworkStatus(rpc: SolanaRpc = solanaRpc): Promise<SolanaNetworkStatus> {
  const [slot, blockHeight] = await Promise.all([rpc.getSlot(), rpc.getBlockHeight()]);
  if (safeRpcNumber(slot) === null || safeRpcNumber(blockHeight) === null) throw new Error('Solana returned an invalid slot or block height.');
  return { slot, blockHeight, checkedAt: Date.now() };
}

export function normalizeTokenAccounts(response: TokenAccountResponse): SolanaTokenAccount[] {
  return response.value.flatMap(item => {
    const parsed = item.account.data.parsed;
    const info = parsed?.info;
    const amount = info?.tokenAmount;
    const decimals = amount?.decimals;
    if (!isSolanaAddress(item.pubkey) || !isSolanaAddress(info?.mint) || !isSolanaAddress(info?.owner) || typeof amount?.amount !== 'string' || typeof decimals !== 'number' || !Number.isSafeInteger(decimals) || decimals < 0) return [];
    return [{ address: item.pubkey, mint: info.mint, owner: info.owner, amountRaw: amount.amount, decimals, uiAmount: typeof amount.uiAmount === 'number' && Number.isFinite(amount.uiAmount) ? amount.uiAmount : undefined, program: program(item.account.owner ?? item.account.data.program), state: parsed?.type }];
  });
}
