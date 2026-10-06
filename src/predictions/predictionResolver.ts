import type { Fighter } from '../types';
import type { BattleEvent, LivePredictionMarket } from './predictionTypes';

export type MarketResolutionStatus = 'PUSH' | 'VOID' | 'EXPIRED';
export interface MarketResolution { status?: MarketResolutionStatus; selectionId?: string; }

const selected = (market: LivePredictionMarket, fighterId: string | undefined) => fighterId && market.selections.some(selection => selection.id === fighterId) ? fighterId : undefined;
const alive = (fighters: Fighter[], id: string | undefined) => Boolean(id && fighters.some(fighter => fighter.id === id && fighter.health > 0));

export function resolveFromEvent(market: LivePredictionMarket, event: BattleEvent): MarketResolution | null {
  if (event.type === 'ROUND_ENDED') {
    if (market.kind === 'round_winner') return selected(market, event.winnerId) ? { selectionId: event.winnerId } : { status: 'VOID' };
    return { status: 'VOID' };
  }
  if (market.kind === 'next_kill' && event.type === 'FIGHTER_KILLED') return event.fighterId ? (selected(market, event.fighterId) ? { selectionId: event.fighterId } : { status: 'VOID' }) : { status: 'VOID' };
  if (market.kind === 'next_death' && event.type === 'FIGHTER_KILLED') return selected(market, event.targetId) ? { selectionId: event.targetId } : { status: 'VOID' };
  if (market.kind === 'next_critical' && event.type === 'CRITICAL_HIT') return selected(market, event.fighterId) ? { selectionId: event.fighterId } : { status: 'VOID' };
  if (market.kind === 'next_respawn' && event.type === 'FIGHTER_RESPAWNED') return selected(market, event.fighterId) ? { selectionId: event.fighterId } : { status: 'VOID' };
  if (market.kind === 'death_window' && event.type === 'FIGHTER_KILLED') return { selectionId: 'yes' };
  if (market.kind === 'survive_window' && event.type === 'FIGHTER_KILLED' && event.targetId === market.subjectId) return { selectionId: 'no' };
  if (market.kind === 'streak_target' && event.type === 'STREAK_CHANGED' && event.fighterId === market.subjectId && (event.streak ?? 0) >= (market.targetStreak ?? Infinity)) return { selectionId: 'yes' };
  if (market.kind === 'streak_target' && event.type === 'FIGHTER_KILLED' && event.targetId === market.subjectId) return { selectionId: 'no' };
  return null;
}

function damageLeader(market: LivePredictionMarket, fighters: Fighter[]): MarketResolution {
  const scores = market.selections.map(selection => ({ selection, score: (fighters.find(fighter => fighter.id === selection.fighterId)?.roundDamage ?? 0) - (market.baselineDamage?.[selection.fighterId ?? ''] ?? 0) })).sort((a, b) => b.score - a.score);
  if (!scores.length || scores[0].score <= 0) return { status: 'VOID' };
  if (scores[1] && scores[0].score === scores[1].score) return { status: 'PUSH' };
  return { selectionId: scores[0].selection.id };
}

export function resolveAtDeadline(market: LivePredictionMarket, fighters: Fighter[]): MarketResolution | null {
  switch (market.kind) {
    case 'death_window': return { selectionId: 'no' };
    case 'survive_window': return { selectionId: alive(fighters, market.subjectId) ? 'yes' : 'no' };
    case 'streak_target': return { selectionId: fighters.find(fighter => fighter.id === market.subjectId)?.streak === market.targetStreak ? 'yes' : 'no' };
    case 'damage_leader': return damageLeader(market, fighters);
    default: return null;
  }
}

export function betStatusFor(resolution: MarketResolution, selectionId: string): { status: 'WON' | 'LOST' | 'PUSH' | 'VOID' | 'EXPIRED'; payout: boolean } {
  if (resolution.status === 'PUSH') return { status: 'PUSH', payout: true };
  if (resolution.status === 'EXPIRED') return { status: 'EXPIRED', payout: true };
  if (resolution.status === 'VOID' || !resolution.selectionId) return { status: 'VOID', payout: true };
  return { status: resolution.selectionId === selectionId ? 'WON' : 'LOST', payout: resolution.selectionId === selectionId };
}
