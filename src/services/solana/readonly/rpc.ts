import type { JsonRpcResponse } from './types';

export const SOLANA_RPC_URL = 'https://api.mainnet.solana.com';
const REQUEST_TIMEOUT = 10_000;

export async function solanaRpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await window.fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Solana RPC HTTP error: ${response.status}`);
    const data = await response.json() as JsonRpcResponse<T>;
    if (data.error) throw new Error(`Solana RPC error ${data.error.code}: ${data.error.message}`);
    if (data.result === undefined) throw new Error('Solana RPC returned no result');
    return data.result;
  } finally {
    window.clearTimeout(timeout);
  }
}
