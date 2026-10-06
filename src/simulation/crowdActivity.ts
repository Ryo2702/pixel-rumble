import { AUDIENCE } from '../config/audience';
import type { AudienceSignal } from './types';

export class CrowdActivity {
  excitement = 0.15;
  elapsed = 0;
  constructor(public watchers = AUDIENCE.baseWatchers) {}
  signal(signal: AudienceSignal) {
    const boosts: Record<AudienceSignal['kind'], number> = { open: 0.3, lock: 0.08, kill: 0.08, critical: 0.025, respawn: 0.015, streak: 0.25, upset: 0.5, winner: 0.25, boss: 0.65, sudden: 0.55, 'large-bet': 0.18 };
    this.excitement = Math.min(1, this.excitement + boosts[signal.kind]);
  }
  update(dt: number) {
    this.elapsed += dt;
    this.excitement = Math.max(0.08, this.excitement * Math.exp(-dt * 0.035));
    const target = Math.min(AUDIENCE.population, AUDIENCE.baseWatchers + this.excitement * 680 + Math.sin(this.elapsed / 28) * 35);
    this.watchers += (target - this.watchers) * (1 - Math.exp(-dt * 0.5));
  }
  betRate(remaining: number, total: number) {
    const progress = 1 - remaining / total;
    return AUDIENCE.betsPerSecond * (0.7 + this.excitement * 0.6 + (progress < 0.15 ? 0.4 : 0) + (progress > 0.75 ? 0.8 : 0));
  }
}
