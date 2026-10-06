import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePairs, normalizeTokens } from '../src/services/stonkfun/adapters';

const mint = 'AB5q6mS6uhKTDDJ38kFcAG1BWQ85TYY2PEakgCkpqgzY';

test('StonkFun adapters keep real fields and reject unsafe token identifiers', () => {
  const tokens = normalizeTokens({ data: { tokens: [{ mint, pool: '2Ao9rToJFiL7W2RZLWBcgmD3Uz1bgQewmXCcTnUa5cW3', name: 'Zcat', symbol: 'WINK', quote: { mint: 'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS', symbol: 'ZEC', name: 'Zcash' }, launchpad: 'launchlab', mode: 'reward', quoteOnlyFees: true, links: {}, market: { priceUsd: 0.000004696932296017517, liquidityUsd: 644.924733108545 }, status: 'new', createdAt: '2026-10-06T15:39:59.122Z' }], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 }, network: 'mainnet-beta' }, meta: { generatedAt: '2026-10-06T15:43:10.696Z' } });
  const pairs = normalizePairs({ data: { pairs: [{ mint, symbol: 'WINK', name: 'Zcat', decimals: 6, category: 'custom', categoryLabel: 'Custom', tokenProgram: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', launchable: true, symbolAmbiguous: false, launchLabReady: true, communityMode: true }], selectBy: 'mint', ambiguousSymbolCount: 0 }, meta: { generatedAt: '2026-10-06T15:43:10.696Z' } });
  assert.equal(tokens.tokens[0].market.priceUsd, 0.000004696932296017517);
  assert.equal(tokens.tokens[0].network, 'mainnet-beta');
  assert.equal(pairs.pairs[0].launchable, true);
  assert.throws(() => normalizeTokens({ data: { tokens: [], pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 }, network: 'ethereum' }, meta: { generatedAt: '2026-10-06T15:43:10.696Z' } }));
  assert.throws(() => normalizeTokens({ data: { tokens: [{ mint: 'fake', pool: mint, name: 'Bad', symbol: 'BAD', quote: { mint, symbol: 'USD', name: 'USD' }, launchpad: 'launchlab', mode: 'reward', quoteOnlyFees: true, links: {}, createdAt: '2026-10-06T15:39:59.122Z' }], pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 }, network: 'mainnet-beta' }, meta: { generatedAt: '2026-10-06T15:43:10.696Z' } }));
});
