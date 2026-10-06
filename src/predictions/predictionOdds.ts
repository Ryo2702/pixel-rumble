import { CONFIG, WEAPONS } from '../config/game';
import type { ArenaConfig, Fighter, Hazard } from '../types';
import type { LivePredictionKind, LivePredictionMarket, LiveSelection } from './predictionTypes';

export interface LiveOddsContext {
  fighters: Fighter[];
  arena: ArenaConfig;
  hazard: Hazard | null;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const roundOdds = (value: number) => Math.round(clamp(value, CONFIG.odds.min, CONFIG.odds.max) * 100) / 100;

function fighterWeight(fighter: Fighter, context: LiveOddsContext, kind: LivePredictionKind) {
  const health = fighter.health / fighter.maxHealth;
  const weapon = WEAPONS[fighter.weapon];
  const target = context.fighters.find(other => other.id === fighter.targetId && other.health > 0);
  const nearby = context.fighters.filter(other => other.id !== fighter.id && other.health > 0 && Math.hypot(other.x - fighter.x, other.y - fighter.y) < 180).length;
  const targetDistance = target ? Math.hypot(target.x - fighter.x, target.y - fighter.y) : 999;
  const hazardDistance = context.hazard ? Math.hypot(context.hazard.x - fighter.x, context.hazard.y - fighter.y) : 999;
  const hazardPressure = context.hazard?.active && hazardDistance < context.hazard.radius ? 0.65 : 1;
  const attackPressure = fighter.attack * weapon.damage * (0.8 + fighter.aggression * 0.3);
  const defensePressure = fighter.defense + fighter.maxHealth * 0.12;

  switch (kind) {
    case 'next_death': return Math.max(0.1, (1.2 - health) * 2.2 + nearby * 0.12 + (targetDistance < 100 ? 0.2 : 0)) * hazardPressure;
    case 'next_critical': return Math.max(0.1, fighter.critical + weapon.critical + attackPressure / 220 + (targetDistance < 120 ? 0.18 : 0));
    case 'next_respawn': return Math.max(0.1, 1 / Math.max(0.4, fighter.respawn + 0.6));
    case 'damage_leader': return Math.max(0.1, attackPressure * (1 + fighter.roundDamage / 240) + nearby * 1.2);
    case 'round_winner': return Math.max(0.1, attackPressure + defensePressure + health * 35 + fighter.streak * 4 + (fighter.class === context.arena.favored ? 18 : 0));
    default: return Math.max(0.1, attackPressure + defensePressure * 0.6 + health * 28 + nearby * 1.4 + fighter.streak * 3 + (targetDistance < 120 ? 12 : 0) + (fighter.class === context.arena.favored ? 15 : 0)) * hazardPressure;
  }
}

function yesProbability(market: LivePredictionMarket, context: LiveOddsContext) {
  const subject = context.fighters.find(fighter => fighter.id === market.subjectId);
  if (market.kind === 'death_window') {
    const live = context.fighters.filter(fighter => fighter.health > 0);
    return clamp(0.22 + live.reduce((sum, fighter) => sum + (1 - fighter.health / fighter.maxHealth) * 0.12 + fighter.aggression * 0.025, 0), 0.22, 0.82);
  }
  if (!subject) return 0.5;
  if (market.kind === 'streak_target') return clamp(0.28 + subject.streak * 0.08 + subject.aggression * 0.18 - (1 - subject.health / subject.maxHealth) * 0.22, 0.2, 0.8);
  return clamp(0.25 + subject.health / subject.maxHealth * 0.52 + subject.defense / 180 + subject.dodge * 0.18 - subject.recentDeaths * 0.025, 0.12, 0.88);
}

export function refreshMarketOdds(market: LivePredictionMarket, context: LiveOddsContext): LiveSelection[] {
  if (market.selections.length === 2 && market.selections.every(selection => selection.id === 'yes' || selection.id === 'no')) {
    const yes = yesProbability(market, context);
    return market.selections.map(selection => ({ ...selection, odds: roundOdds(0.94 / (selection.id === 'yes' ? yes : 1 - yes)) }));
  }
  const weights = market.selections.map(selection => {
    const fighter = context.fighters.find(candidate => candidate.id === selection.fighterId);
    return fighter ? fighterWeight(fighter, context, market.kind) : 0.1;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  return market.selections.map((selection, index) => ({ ...selection, odds: roundOdds(0.94 / (weights[index] / total)) }));
}
