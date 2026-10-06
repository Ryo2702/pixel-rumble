import { BroadcastFeed, CommunityPreview, Winners } from './AudiencePanels';
import type { Snapshot } from '../types';

export function LivePanels({ state, openLeaderboard }: { state: Snapshot; openLeaderboard: () => void }) {
  return <><div className="under-grid"><BroadcastFeed state={state}/><Winners audience={state.audience} currentRound={state.round}/></div><CommunityPreview audience={state.audience} open={openLeaderboard}/></>;
}
