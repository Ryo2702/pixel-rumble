import { AUDIENCE } from '../config/audience';
import { randomSOLAmount } from '../economy/currency';
import { quotedOdds } from '../economy/predictions';
import type { Fighter, RoundEvent } from '../types';
import type { AudienceBet, Spectator } from './types';

export function pickFighter(person: Spectator, fighters: Fighter[], random: () => number): Fighter {
  const weights = fighters.map(f => {
    switch (person.personality) {
      case 'conservative': return 1 / f.odds ** 3;
      case 'underdog': return f.odds ** 3;
      case 'trend': return (1 + f.streak * 2 + f.recent.slice(-3).filter(Boolean).length * 1.5) * (1 + f.popularity / 25);
      case 'high-roller': return (f.id === person.favoriteFighter ? 3 : 1) / f.odds;
      default: return 1;
    }
  });
  let pick = random() * weights.reduce((sum, w) => sum + w, 0);
  return fighters[weights.findIndex(weight => (pick -= weight) <= 0)] ?? fighters.at(-1)!;
}
export function createAudienceBet(person: Spectator, fighters: Fighter[], round: number, event: RoundEvent, random: () => number, now: number): AudienceBet | null {
  const behavior = AUDIENCE.behavior[person.personality];
  if (random() > behavior.participation || person.balance < behavior.min) return null;
  const fighter = pickFighter(person, fighters, random);
  const amount = randomSOLAmount(behavior.min, Math.min(behavior.max, person.balance), () => Math.pow(random(), 1.7));
  if (amount === null) return null;
  let type: AudienceBet['type'] = 'winner', fighterId = fighter.id, fighterName = fighter.name, baseOdds = fighter.odds;
  if (event === 'BOSS INVASION') {
    const pick = random();
    if (pick < 0.38) { type = 'team'; fighterId = random() < 0.65 ? 'fighters' : 'boss'; fighterName = fighterId === 'boss' ? 'The Overlord' : 'The fighters'; baseOdds = fighterId === 'boss' ? 2.4 : 1.65; }
    else if (pick < 0.56) { type = 'survival'; baseOdds = 7.2; }
    else if (pick < 0.75) { type = 'damage'; baseOdds = 7.2; }
  }
  return { id: `crowd-${round}-${person.id}`, spectatorId: person.id, username: person.username, avatar: person.avatar, isUser: false, round, fighterId, fighterName, type, amount, odds: quotedOdds(baseOdds, event), status: 'pending', payout: 0, createdAt: now };
}
