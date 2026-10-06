import { solanaRpc } from './rpc';
import type { RpcContext, SolanaNetworkSnapshot, SolanaSupplyValue } from './types';

type SupplyResponse = { context: RpcContext; value: SolanaSupplyValue };
type EpochResponse = { epoch: number };
type VersionResponse = { 'solana-core': string };

function number(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`Solana returned an invalid ${field}.`);
  return value;
}

export async function getNetworkSnapshot(): Promise<SolanaNetworkSnapshot> {
  const [slot, supply, version, epoch, blockHeight, transactionCount] = await Promise.all([
    solanaRpc<number>('getSlot', [{ commitment: 'confirmed' }]),
    solanaRpc<SupplyResponse>('getSupply', [{ commitment: 'confirmed', excludeNonCirculatingAccountsList: true }]),
    solanaRpc<VersionResponse>('getVersion'),
    solanaRpc<EpochResponse>('getEpochInfo', [{ commitment: 'confirmed' }]),
    solanaRpc<number>('getBlockHeight', [{ commitment: 'confirmed' }]),
    solanaRpc<number>('getTransactionCount', [{ commitment: 'confirmed' }]),
  ]);
  const value = supply?.value;
  if (!value) throw new Error('Solana returned no supply data.');
  const rpcVersion = version?.['solana-core'];
  if (typeof rpcVersion !== 'string') throw new Error('Solana returned an invalid RPC version.');
  return {
    slot: number(slot, 'slot'),
    blockHeight: number(blockHeight, 'block height'),
    epoch: number(epoch?.epoch, 'epoch'),
    transactionCount: number(transactionCount, 'transaction count'),
    version: rpcVersion,
    totalLamports: number(value.total, 'total supply'),
    circulatingLamports: number(value.circulating, 'circulating supply'),
    nonCirculatingLamports: number(value.nonCirculating, 'non-circulating supply'),
  };
}
