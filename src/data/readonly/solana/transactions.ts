import { solanaRpc, type SolanaRpc } from './rpc';
import type { SolanaSignatureStatus } from './types';
import { isSolanaSignature, safeRpcNumber } from './validation';

export async function getSignatureStatus(signature: string, rpc: SolanaRpc = solanaRpc): Promise<SolanaSignatureStatus | null> {
  if (!isSolanaSignature(signature)) throw new Error('signature is not a valid Solana transaction signature.');
  const response = await rpc.getSignatureStatuses([signature]);
  const status = response.value?.[0];
  if (!status) return null;
  if (status.slot !== undefined && safeRpcNumber(status.slot) === null) throw new Error('Solana returned an invalid transaction slot.');
  return { signature, slot: status.slot, confirmations: status.confirmations, confirmationStatus: status.confirmationStatus, err: status.err };
}
