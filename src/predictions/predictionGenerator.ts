import type { Fighter, Phase, RoundEvent } from '../types';
import { refreshMarketOdds, type LiveOddsContext } from './predictionOdds';
import type { BattleEvent, LivePredictionKind, LivePredictionMarket, LiveSelection } from './predictionTypes';

export interface PredictionGenerationContext extends LiveOddsContext {
  round: number;
  phase: Phase;
  time: number;
  event: RoundEvent;
  remaining: number;
}

const colors = { yes: '#d6f65c', no: '#f08794' };
const alive = (fighters: Fighter[]) => fighters.filter(fighter => fighter.health > 0);
const score = (fighter: Fighter) => fighter.roundDamage + fighter.roundKills * 30 + fighter.health / fighter.maxHealth * 20 + fighter.popularity;

function fighterSelections(fighters: Fighter[], limit = 4): LiveSelection[] {
  return [...fighters].sort((a, b) => score(b) - score(a)).slice(0, limit).map(fighter => ({ id: fighter.id, fighterId: fighter.id, label: fighter.name, color: fighter.color, odds: 2 }));
}

function yesNo(): LiveSelection[] {
  return [{ id: 'yes', label: 'YES', color: colors.yes, odds: 2 }, { id: 'no', label: 'NO', color: colors.no, odds: 2 }];
}

function candidates(trigger: BattleEvent['type'], event: BattleEvent, context: PredictionGenerationContext): Array<{ kind: LivePredictionKind; subject?: Fighter }> {
  const living = alive(context.fighters);
  if (trigger === 'ROUND_STARTED') return [{ kind: 'next_kill' }, { kind: 'next_critical' }];
  if (trigger === 'FIGHTER_DAMAGED' && event.targetId) {
    const subject = context.fighters.find(fighter => fighter.id === event.targetId);
    if (subject && subject.health > 0 && subject.health / subject.maxHealth <= 0.25) return [{ kind: 'survive_window', subject }];
  }
  if (trigger === 'STREAK_CHANGED' && event.fighterId && (event.streak ?? 0) >= 4) {
    const subject = context.fighters.find(fighter => fighter.id === event.fighterId);
    if (subject) return [{ kind: 'streak_target', subject }, { kind: 'next_kill' }];
  }
  if (trigger === 'HAZARD_TRIGGERED') return [{ kind: 'death_window' }, { kind: 'next_death' }];
  if (trigger === 'FIGHTER_RESPAWNED') return [{ kind: 'next_kill' }, { kind: 'next_critical' }];
  if (trigger === 'CRITICAL_HIT') return [{ kind: 'next_kill' }, { kind: 'next_death' }];
  if (trigger === 'FIGHTER_KILLED') return [{ kind: 'next_kill' }, { kind: 'next_death' }, { kind: 'next_respawn' }];
  if (trigger === 'ROUND_ENDING') return [{ kind: 'round_winner' }, { kind: 'damage_leader' }];
  return living.length > 1 ? [{ kind: 'next_kill' }] : [{ kind: 'death_window' }];
}

function makeMarket(kind: LivePredictionKind, subject: Fighter | undefined, sequence: number, context: PredictionGenerationContext): LivePredictionMarket | null {
  const living = alive(context.fighters);
  const dead = context.fighters.filter(fighter => fighter.health <= 0);
  let question = '', selections: LiveSelection[] = [], windowSeconds = [10, 15, 20][sequence % 3], subjectId = subject?.id, subjectName = subject?.name, targetStreak: number | undefined;
  switch (kind) {
    case 'next_kill': question = 'WHO GETS THE NEXT KILL?'; selections = fighterSelections(living); break;
    case 'next_death': question = 'WHO DIES NEXT?'; selections = fighterSelections(living); break;
    case 'next_critical': question = 'WHO LANDS THE NEXT CRITICAL HIT?'; selections = fighterSelections(living); break;
    case 'next_respawn': question = 'WHO RESURRECTS NEXT?'; selections = fighterSelections(dead); break;
    case 'damage_leader': question = 'WHO DEALS THE MOST DAMAGE IN THE NEXT 20 SECONDS?'; selections = fighterSelections(context.fighters, context.fighters.length); windowSeconds = 20; break;
    case 'death_window': question = 'WILL SOMEONE DIE IN THE NEXT 10 SECONDS?'; selections = yesNo(); windowSeconds = 10; subjectId = undefined; subjectName = undefined; break;
    case 'survive_window': question = `WILL ${subject?.name ?? 'THE FIGHTER'} SURVIVE THE NEXT 15 SECONDS?`; selections = yesNo(); windowSeconds = 15; break;
    case 'streak_target': targetStreak = (subject?.streak ?? 4) + 1; question = `WILL ${subject?.name ?? 'THE FIGHTER'} REACH ${targetStreak} KILLS?`; selections = yesNo(); windowSeconds = 15; break;
    case 'round_winner': question = 'WHO WINS THE CURRENT RUMBLE?'; selections = fighterSelections(context.fighters, context.fighters.length); windowSeconds = 20; break;
  }
  if (!selections.length) return null;
  const market: LivePredictionMarket = { id: `live-${context.round}-${sequence}`, round: context.round, kind, question, selections, status: 'OPEN', openedAt: context.time, closesAt: context.time + windowSeconds, windowSeconds, subjectId, subjectName, targetStreak, baselineDamage: kind === 'damage_leader' ? Object.fromEntries(context.fighters.map(fighter => [fighter.id, fighter.roundDamage])) : undefined };
  return { ...market, selections: refreshMarketOdds(market, context) };
}

export function generatePrediction(context: PredictionGenerationContext, trigger: BattleEvent['type'], event: BattleEvent, sequence: number, blocked: Set<LivePredictionKind>): LivePredictionMarket | null {
  for (const candidate of candidates(trigger, event, context)) {
    if (blocked.has(candidate.kind)) continue;
    const market = makeMarket(candidate.kind, candidate.subject, sequence, context);
    if (market) return market;
  }
  return null;
}
