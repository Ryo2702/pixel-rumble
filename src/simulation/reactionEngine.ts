import { AUDIENCE } from '../config/audience';
import { formatSOL } from '../economy/currency';
import type { AudienceSignal, Reaction, Spectator } from './types';

export class ReactionEngine {
  messages: Reaction[] = [];
  private id = 0;
  private lastCritical = -Infinity;
  constructor(private random: () => number) {}
  signal(event: AudienceSignal, people: Spectator[], now: number, elapsed: number) {
    if (event.kind === 'critical') { if (elapsed - this.lastCritical < 2) return; this.lastCritical = elapsed; }
    const f = event.fighter ?? 'THE ARENA';
    const lines: Record<AudienceSignal['kind'], string[]> = {
      open: [`${f} has my vote`, 'fresh round. fresh delusions.', 'odds looking interesting 👀', `${f} believers check in`],
      lock: ['bets locked. here we go', 'no backing out now', 'good luck underground'],
      kill: [`${f} AGAIN`, `${event.victim ?? 'someone'} got deleted`, `${f} is cooking`, 'that was personal'],
      critical: [`${f} HIT THAT?!`, 'that crit was illegal', `${Math.round(event.amount ?? 0)} DAMAGE. okay.`],
      respawn: [`${f} comeback?`, `${f} lives. again.`, 'death is a suggestion'],
      streak: [`${f} CANNOT BE STOPPED`, `${f} streak goes crazy`, `imagine fading ${f}`],
      upset: [`${f} AT ${event.odds?.toFixed(2)}X?!`, 'no way. NO WAY.', 'underdog gang eating', 'the crowd got it so wrong'],
      winner: [`${f} TAKES IT`, 'gg underground', `${f} believers paid`, 'run it back'],
      boss: ['THE OVERLORD???', 'everybody gang up', 'boss round. hold onto something'],
      sudden: ['SUDDEN DEATH LETS GO', 'one hit changes everything', 'this is about to get ugly'],
      'large-bet': [`${formatSOL(event.amount ?? 0)} ON ${f}?`, `someone REALLY believes in ${f}`, 'whale in the chat 🐋'],
    };
    const count = ['upset', 'winner', 'boss'].includes(event.kind) ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const person = people[Math.floor(this.random() * people.length)];
      if (!person) return;
      this.messages.unshift({ id: ++this.id, username: person.username, avatar: person.avatar, text: lines[event.kind][Math.floor(this.random() * lines[event.kind].length)], kind: event.kind, time: now });
    }
    this.messages = this.messages.slice(0, AUDIENCE.maxReactions);
  }
}
