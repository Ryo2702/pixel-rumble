import { SOLANA_NETWORK } from './types';

export const DEFAULT_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
export const SOLANA_RPC_URL = (() => {
  const configured = import.meta.env?.VITE_SOLANA_RPC_URL?.trim();
  if (!configured) return DEFAULT_SOLANA_RPC_URL;
  try {
    const url = new URL(configured);
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return DEFAULT_SOLANA_RPC_URL;
    return url.href;
  } catch {
    return DEFAULT_SOLANA_RPC_URL;
  }
})();

const REQUEST_TIMEOUT = 12_000;

export class SolanaRpcError extends Error {
  constructor(message: string, readonly code?: number | string, readonly status?: number, readonly retryAfter?: string | null) {
    super(message);
    this.name = 'SolanaRpcError';
  }
}

type RpcResponse = { result?: unknown; error?: { code?: number; message?: string; data?: unknown } };
type ReadMethod = 'getAccountInfo' | 'getMultipleAccounts' | 'getBalance' | 'getSlot' | 'getBlockHeight' | 'getSignatureStatuses' | 'getTokenAccountsByOwner';
const READ_METHODS = new Set<ReadMethod>(['getAccountInfo', 'getMultipleAccounts', 'getBalance', 'getSlot', 'getBlockHeight', 'getSignatureStatuses', 'getTokenAccountsByOwner']);

export class SolanaRpcClient {
  private requestId = 0;

  constructor(private readonly request: typeof fetch = fetch, private readonly endpoint = SOLANA_RPC_URL) {}

  async read<T>(method: ReadMethod, params: unknown[] = []): Promise<T> {
    if (!READ_METHODS.has(method)) throw new SolanaRpcError('Solana RPC method is not read-only.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    let response: Response;
    try {
      response = await this.request(this.endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: ++this.requestId, method, params }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new SolanaRpcError(error instanceof DOMException && error.name === 'AbortError' ? `Solana ${SOLANA_NETWORK} RPC timed out.` : error instanceof Error ? error.message : 'Solana RPC request failed.');
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new SolanaRpcError(`Solana RPC request failed: ${response.status}`, undefined, response.status, response.headers.get('Retry-After'));
    let body: RpcResponse;
    try {
      body = await response.json() as RpcResponse;
    } catch {
      throw new SolanaRpcError('Solana RPC returned invalid JSON.');
    }
    if (!body || typeof body !== 'object') throw new SolanaRpcError('Solana RPC returned an invalid response.');
    if (body.error) throw new SolanaRpcError(body.error.message || 'Solana RPC returned an error.', body.error.code);
    if (!Object.prototype.hasOwnProperty.call(body, 'result')) throw new SolanaRpcError('Solana RPC response did not include a result.');
    return body.result as T;
  }
}

export const solanaRpcClient = new SolanaRpcClient();
