import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SolanaRpcClient } from '../src/data/readonly/solana/client';
import { isSolanaAddress, parseMintAccount } from '../src/data/readonly/solana/validation';
import type { SolanaAccountInfo } from '../src/data/readonly/solana/types';

test('accepts only 32-byte Solana public keys', () => {
  assert.equal(isSolanaAddress('So11111111111111111111111111111111111111112'), true);
  assert.equal(isSolanaAddress('not-a-solana-address'), false);
});

test('reads SPL mint supply, decimals, and initialization from account data', () => {
  const bytes = new Uint8Array(82);
  new DataView(bytes.buffer).setBigUint64(36, 123456789n, true);
  bytes[44] = 6;
  bytes[45] = 1;
  const account: SolanaAccountInfo = { data: [Buffer.from(bytes).toString('base64'), 'base64'], executable: false, lamports: 1, owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' };
  assert.deepEqual(parseMintAccount(account), { supplyRaw: '123456789', decimals: 6, initialized: true });
});

test('RPC client rejects non-read methods before making a request', async () => {
  let requested = false;
  const client = new SolanaRpcClient(async () => { requested = true; throw new Error('request should not run'); });
  await assert.rejects(() => client.read('sendTransaction' as never), /not read-only/);
  assert.equal(requested, false);
});
