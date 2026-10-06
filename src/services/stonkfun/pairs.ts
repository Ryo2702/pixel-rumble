import { stonkFunClient, StonkFunClient } from './client';
import type { StonkFunPairsResponse } from './types';

export function getLaunchablePairs(client: StonkFunClient = stonkFunClient) {
  return client.get<StonkFunPairsResponse>('/pairs?launchable=true');
}
