import { BroadcastFeed, CommunityPreview, Winners } from './AudiencePanels';
import type { Snapshot } from '../types';
import type { MarketToken } from '../services/stonkfun/types';

export function LivePanels({ state, tokens, openLeaderboard }: { state: Snapshot; tokens: MarketToken[]; openLeaderboard: () => void }) {
  return <><div className="under-grid"><BroadcastFeed state={state} tokens={tokens}/><Winners audience={state.audience} currentRound={state.round}/></div><CommunityPreview audience={state.audience} open={openLeaderboard}/></>;
}
