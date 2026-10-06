import { SolanaRpcError } from './client';
import { solanaRpc, type SolanaRpc } from './rpc';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from './types';
import type { SolanaAccountInfo, SolanaRpcContext, SolanaTokenVerification } from './types';
import { isSolanaAddress, parseMintAccount, safeRpcNumber } from './validation';

function program(owner: string) {
  return owner === TOKEN_PROGRAM_ID ? 'spl-token' as const : owner === TOKEN_2022_PROGRAM_ID ? 'token-2022' as const : 'unknown' as const;
}

function unavailable(mint: string, error: unknown): SolanaTokenVerification {
  return { status: 'unavailable', mint, accountExists: false, program: 'unknown', checkedAt: Date.now(), error: error instanceof SolanaRpcError || error instanceof Error ? error.message.slice(0, 180) : 'Solana data is unavailable.' };
}

function inspect(mint: string, account: SolanaAccountInfo | null, context: SolanaRpcContext): SolanaTokenVerification {
  const slot = safeRpcNumber(context?.slot);
  if (slot === null) return unavailable(mint, 'Solana returned an invalid slot.');
  if (!account) return { status: 'unverified', mint, accountExists: false, program: 'unknown', slot, checkedAt: Date.now(), error: 'Mint account was not found on Solana Mainnet.' };
  const tokenProgram = program(account.owner);
  const parsed = tokenProgram === 'unknown' || account.executable ? null : parseMintAccount(account);
  if (!parsed?.initialized) return { status: 'unverified', mint, accountExists: true, program: tokenProgram, slot, checkedAt: Date.now(), error: 'Account is not an initialized SPL token mint.' };
  return { status: 'verified', mint, accountExists: true, program: tokenProgram, decimals: parsed.decimals, supplyRaw: parsed.supplyRaw, slot, checkedAt: Date.now() };
}

export async function verifyTokenMint(mint: string, rpc: SolanaRpc = solanaRpc): Promise<SolanaTokenVerification> {
  if (!isSolanaAddress(mint)) return { status: 'unverified', mint, accountExists: false, program: 'unknown', checkedAt: Date.now(), error: 'Mint is not a valid Solana address.' };
  try {
    const response = await rpc.getAccountInfo(mint);
    return inspect(mint, response.value, response.context);
  } catch (error) {
    return unavailable(mint, error);
  }
}

export async function verifyTokenMints(mints: string[], rpc: SolanaRpc = solanaRpc): Promise<Map<string, SolanaTokenVerification>> {
  const unique = [...new Set(mints)];
  const verifications = new Map<string, SolanaTokenVerification>();
  const valid = unique.filter(mint => {
    if (isSolanaAddress(mint)) return true;
    verifications.set(mint, { status: 'unverified', mint, accountExists: false, program: 'unknown', checkedAt: Date.now(), error: 'Mint is not a valid Solana address.' });
    return false;
  });
  for (let index = 0; index < valid.length; index += 100) {
    const chunk = valid.slice(index, index + 100);
    try {
      const response = await rpc.getMultipleAccounts(chunk);
      if (!Array.isArray(response.value) || response.value.length !== chunk.length) throw new Error('Solana returned an invalid account batch.');
      chunk.forEach((mint, offset) => verifications.set(mint, inspect(mint, response.value[offset], response.context)));
    } catch (error) {
      chunk.forEach(mint => verifications.set(mint, unavailable(mint, error)));
    }
  }
  return verifications;
}
