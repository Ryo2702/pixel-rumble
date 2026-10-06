import { stonkFunClient, StonkFunClient } from './client';
import type { StonkFunTokensResponse } from './types';

export function getNewestTokens(client: StonkFunClient = stonkFunClient) {
  return client.get<StonkFunTokensResponse>('/tokens?sort=newest');
}
