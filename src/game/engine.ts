import { ARENAS, CLASSES, CONFIG, FIGHTERS, WEAPONS } from '../config/game';
import { calculateOdds, quotedOdds, settlePrediction, validateWager } from '../economy/predictions';
import { loadSave, localAdapter } from '../economy/persistence';
import type { PersistenceAdapter } from '../economy/persistence';
import type { Boss, CombatEvent, FeedItem, Fighter, Hazard, Phase, Prediction, RoundEvent, SaveData, Settings, Snapshot } from '../types';
import { AudienceEngine } from '../simulation/audienceEngine';
import { predictionWon } from '../simulation/payoutEngine';
import { recordResult } from '../simulation/leaderboardEngine';
import { money, roundMoney } from '../economy/money';

export class GameEngine {
  fighters: Fighter[];
  phase: Phase = 'betting';
  remaining: number = CONFIG.phases.betting;
  round = 1;
  arenaIndex = 0;
  event: RoundEvent = 'STANDARD RUMBLE';
  feed: FeedItem[] = [];
  save: SaveData;
  audience: AudienceEngine;
  winner: string | null = null;
  boss: Boss | null = null;
  hazard: Hazard | null = null;
  speed = 1;
  slowMotion = 0;
  storageError = false;
  elapsed = 0;
  private publication = 0;
  private hazardClock = 0;
  private feedId = 0;
  private listeners = new Set<() => void>();
  private effectListeners = new Set<(event: CombatEvent) => void>();
  private snapshot!: Snapshot;

  constructor(private adapter: PersistenceAdapter = localAdapter, private random: () => number = Math.random) {
    this.save = loadSave(adapter);
    this.audience = new AudienceEngine(this.save.community);
    if (!this.save.community) for (const p of [...this.save.predictions].reverse()) if (p.status !== 'pending') recordResult(this.audience.user, { ...p, spectatorId: 'you', username: 'YOU', avatar: '#d6f65c', isUser: true }, p.createdAt);
    this.audience.user.balance = this.save.balance;
    this.round = Math.max(this.save.roundsWatched + 1, ...this.save.predictions.map(p => p.round + 1));
    this.arenaIndex = Math.floor((this.round - 1) / 2) % ARENAS.length;
    this.event = CONFIG.events[(this.round - 1) % CONFIG.events.length];
    this.fighters = FIGHTERS.map((f, i) => ({ ...f, health: f.maxHealth, x: 175 + (i % 4) * 200, y: 335 + Math.floor(i / 4) * 130, facing: i % 2 ? -1 : 1, moving: false, cooldown: i * 0.2, specialCooldown: 3 + i, respawn: 0, attackFlash: 0, hurtFlash: 0, invulnerable: 0, streak: 0, longestStreak: 3 + i % 4, roundKills: 0, roundDamage: 0, aliveTime: 0, odds: 1, recent: Array.from({ length: 7 }, (_, n) => (n + i) % 3 !== 0), recentDeaths: 0, popularity: 10 + (8 - i) * 2, targetId: null }));
    calculateOdds(this.fighters, this.arena);
    this.audience.beginRound(this.round, this.fighters, this.event);
    this.addFeed('The gates are open', 'Choose your fighter. Make your call.', '#d8fa42', 'round');
    this.addFeed('Welcome to the underground', '8 fighters. One arena. Endless possibilities.', '#ac83ff', 'system');
    this.persist();
    this.publish();
  }
  get arena() { return ARENAS[this.arenaIndex]; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getSnapshot = () => this.snapshot;
  onEffect = (listener: (event: CombatEvent) => void) => { this.effectListeners.add(listener); return () => this.effectListeners.delete(listener); };
  emit(event: CombatEvent) {
    if (event.kind === 'hit' && event.critical) this.audience.signal({ kind: 'critical', fighter: this.fighters.find(f => f.id === event.fighterId)?.name, amount: event.amount });
    if (event.kind === 'respawn') this.audience.signal({ kind: 'respawn', fighter: this.fighters.find(f => f.id === event.fighterId)?.name });
    this.effectListeners.forEach(listener => listener(event));
  }
  private publish() {
    const { community: _community, ...uiSave } = this.save;
    this.snapshot = { phase: this.phase, remaining: Math.ceil(this.remaining), round: this.round, arena: this.arena, event: this.event, fighters: this.fighters.map(f => ({ ...f, recent: [...f.recent] })), feed: [...this.feed], save: { ...uiSave, settings: { ...this.save.settings }, predictions: this.save.predictions.map(p => ({ ...p })), transactions: [...this.save.transactions] }, audience: this.audience.snapshot(), winner: this.winner, boss: this.boss ? { ...this.boss } : null, roundKills: this.fighters.reduce((sum, f) => sum + f.roundKills, 0), speed: this.speed, storageError: this.storageError };
    this.listeners.forEach(listener => listener());
  }
  private persist() {
    this.audience.user.balance = this.save.balance;
    this.save.community = this.audience.export();
    try { this.adapter.save(this.save); this.storageError = false; } catch { this.storageError = true; }
  }
  addFeed(text: string, detail: string, color: string, kind = 'combat') {
    this.feed.unshift({ id: ++this.feedId, text, detail, color, kind, time: Date.now() });
    this.feed = this.feed.slice(0, 40);
  }
  discover(id: string) {
    if (!this.save.discoveries.includes(id) && this.fighters.some(f => f.id === id)) {
      this.save.discoveries.push(id);
      if (this.save.discoveries.length === this.fighters.length) this.achievement('Meet the underground');
      this.persist(); this.publish();
    }
  }
  setSettings(settings: Partial<Settings>) { this.save.settings = { ...this.save.settings, ...settings }; this.persist(); this.publish(); }
  setSpeed(speed: number) { if ([1, 1.5, 2].includes(speed)) { this.speed = speed; this.publish(); } }
  placePrediction(fighterId: string, amount: number, type: Prediction['type'] = 'winner'): string | null {
    if (this.phase !== 'betting') return 'Predictions are locked. The next round opens soon.';
    if (this.save.predictions.some(p => p.round === this.round && p.status === 'pending')) return 'Your prediction for this round is already locked in.';
    const error = validateWager(amount, this.save.balance);
    if (error) return error;
    const fighter = this.fighters.find(f => f.id === fighterId);
    const isBoss = this.event === 'BOSS INVASION';
    if (!['winner', 'team', 'damage', 'survival'].includes(type) || (!isBoss && type !== 'winner')) return 'That prediction is unavailable this round.';
    if (type === 'team' ? !['boss', 'fighters'].includes(fighterId) : !fighter) return 'Select an available fighter.';
    const baseOdds = type === 'team' ? (fighterId === 'boss' ? 2.4 : 1.65) : type === 'winner' ? fighter!.odds : 7.2;
    const prediction: Prediction = { id: `${Date.now()}-${this.round}`, round: this.round, fighterId, fighterName: type === 'team' ? (fighterId === 'boss' ? 'The Overlord' : 'The fighters') : fighter!.name, amount, odds: quotedOdds(baseOdds, this.event), type, status: 'pending', payout: 0, createdAt: Date.now() };
    this.save.balance = roundMoney(this.save.balance - amount);
    this.save.predictions.unshift(prediction);
    this.audience.addUserBet(prediction);
    this.save.transactions.unshift({ id: prediction.id, label: `${prediction.fighterName} · round ${this.round} prediction`, amount: -amount, time: Date.now() });
    this.save.predictions = this.save.predictions.slice(0, 100);
    this.save.transactions = this.save.transactions.slice(0, 100);
    this.achievement('Skin in the game');
    this.addFeed(`You're backing ${prediction.fighterName}`, `${money(amount)} at ${prediction.odds.toFixed(2)}×`, '#d8fa42', 'prediction');
    this.persist(); this.publish();
    return null;
  }
  private achievement(name: string) { if (!this.save.achievements.includes(name)) this.save.achievements.push(name); }
  update(realDelta: number) {
    const dt = Math.min(realDelta, 0.05) * this.speed;
    this.elapsed += dt;
    if (this.phase === 'rumble' && this.remaining <= 0.7) this.slowMotion = Math.max(this.slowMotion, 0.2);
    this.remaining -= dt;
    if (this.remaining <= 0) this.nextPhase();
    const combatDelta = dt * (this.slowMotion > 0 && !this.save.settings.reducedMotion ? 0.35 : 1);
    this.slowMotion = Math.max(0, this.slowMotion - dt);
    for (const f of this.fighters) {
      f.attackFlash = Math.max(0, f.attackFlash - dt);
      f.hurtFlash = Math.max(0, f.hurtFlash - dt);
      f.invulnerable = Math.max(0, f.invulnerable - dt);
      f.moving = false;
    }
    if (this.phase === 'rumble') {
      this.tickCombat(combatDelta);
    }
    this.audience.update(dt, this.phase, this.remaining, this.fighters);
    this.publication += realDelta;
    if (this.publication >= 0.2) { this.publication = 0; this.publish(); }
  }
  private nextPhase() {
    const phases: Phase[] = ['betting', 'locked', 'rumble', 'results', 'resurrection'];
    this.phase = phases[(phases.indexOf(this.phase) + 1) % phases.length];
    this.remaining = CONFIG.phases[this.phase];
    if (this.phase === 'locked') { this.audience.lock(); this.addFeed('Betting locked', 'The crowd has spoken. Time to settle this.', '#f3b95b', 'round'); }
    if (this.phase === 'rumble') {
      if (this.event === 'BOSS INVASION') this.boss = { health: CONFIG.combat.bossHealth, maxHealth: CONFIG.combat.bossHealth, x: 480, y: 380, cooldown: 2, hurtFlash: 0 };
      this.addFeed(this.event === 'BOSS INVASION' ? 'The Overlord has arrived' : 'Let the rumble begin', this.event === 'BOSS INVASION' ? 'The fighters join forces. One life each.' : 'Most eliminations wins. Damage breaks ties.', '#d8fa42', 'round');
      if (this.event === 'BOSS INVASION') this.audience.signal({ kind: 'boss' });
      if (this.event === 'SUDDEN DEATH') this.audience.signal({ kind: 'sudden' });
    }
    if (this.phase === 'results') this.finishRound();
    if (this.phase === 'resurrection') this.fighters.forEach(f => this.resurrect(f));
    if (this.phase === 'betting') this.prepareRound();
    this.emit({ kind: 'phase', x: 480, y: 200, color: '#d8fa42', text: this.phase });
    this.publish();
  }
  private prepareRound() {
    this.round++;
    this.arenaIndex = Math.floor((this.round - 1) / 2) % ARENAS.length;
    this.event = CONFIG.events[(this.round - 1) % CONFIG.events.length];
    this.winner = null; this.boss = null; this.hazard = null; this.hazardClock = 0;
    this.fighters.forEach((f, i) => {
      f.health = f.maxHealth; f.roundKills = 0; f.roundDamage = 0; f.aliveTime = 0; f.respawn = 0;
      f.x = 175 + (i % 4) * 200; f.y = 335 + Math.floor(i / 4) * 130; f.recentDeaths *= 0.6;
      f.specialCooldown = 3 + i; f.cooldown = this.random(); f.targetId = null;
    });
    calculateOdds(this.fighters, this.arena);
    this.audience.beginRound(this.round, this.fighters, this.event);
    this.addFeed(`Round ${this.round} · ${this.arena.name}`, this.event === 'STANDARD RUMBLE' ? 'A clean slate. Predictions are open.' : this.event, this.arena.color, 'round');
  }
  private tickCombat(dt: number) {
    if (this.boss && this.boss.health <= 0) return;
    const live = this.fighters.filter(f => f.health > 0);
    for (const f of this.fighters) {
      if (f.health <= 0) {
        if (!['NO RESPAWN', 'BOSS INVASION'].includes(this.event)) { f.respawn -= dt; if (f.respawn <= 0) this.resurrect(f); }
        continue;
      }
      f.aliveTime += dt;
      f.cooldown -= dt; f.specialCooldown -= dt;
      // ponytail: nearest-target scan is trivial for 8 fighters; use a spatial grid above 100.
      let target = this.fighters.find(other => other.id === f.targetId && other.health > 0);
      if (!target || this.random() < dt * 0.75) target = live.filter(other => other.id !== f.id).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
      f.targetId = target?.id ?? null;
      const enemy = this.boss && this.boss.health > 0 ? this.boss : target;
      if (!enemy) continue;
      const dx = enemy.x - f.x, dy = enemy.y - f.y;
      const distance = Math.hypot(dx, dy) || 1;
      const profile = CLASSES[f.class];
      f.facing = dx >= 0 ? 1 : -1;
      const retreat = f.health / f.maxHealth < profile.retreat && distance < 90 && this.elapsed % 5 < 2;
      const kiting = f.class === 'Gunner' && distance < 95;
      if (distance > profile.reach * 0.85 || retreat || kiting) {
        const direction = retreat || kiting ? -1 : 1;
        const velocity = f.speed * (this.event === 'CHAOS MODE' ? 1.5 : 1) / this.arena.gravity;
        f.x += dx / distance * velocity * dt * direction;
        f.y += dy / distance * velocity * dt * direction * 0.75;
        f.moving = true;
      }
      for (const other of live) {
        if (other === f) continue;
        const sx = f.x - other.x, sy = f.y - other.y, d = Math.hypot(sx, sy);
        if (d < 30 && d > 0) { f.x += sx / d * dt * 27; f.y += sy / d * dt * 27; }
      }
      f.x = Math.max(CONFIG.bounds.left, Math.min(CONFIG.bounds.right, f.x));
      f.y = Math.max(CONFIG.bounds.top, Math.min(CONFIG.bounds.bottom, f.y));
      if (distance < profile.reach + 15 && f.cooldown <= 0) {
        f.cooldown = profile.attackRate * (0.8 + this.random() * 0.45) / f.aggression;
        const special = f.specialCooldown <= 0;
        if (special) { f.specialCooldown = CONFIG.combat.specialCooldown; this.emit({ kind: 'special', x: f.x, y: f.y, color: f.color, text: profile.special, fighterId: f.id }); }
        f.attackFlash = 0.22;
        if (this.boss && this.boss.health > 0) this.attackBoss(f, special);
        else if (target) this.attack(f, target, special);
      }
    }
    if (this.boss && this.boss.health > 0) {
      this.boss.cooldown -= dt;
      this.boss.hurtFlash = Math.max(0, this.boss.hurtFlash - dt);
      if (this.boss.cooldown <= 0) {
        this.boss.cooldown = 1.65;
        const targets = [...live].sort(() => this.random() - 0.5).slice(0, 3);
        targets.forEach(f => this.damage(f, CONFIG.combat.bossDamage * CONFIG.combat.difficulty * (0.7 + this.random() * 0.8), null, 'THE OVERLORD'));
        this.emit({ kind: 'special', x: this.boss.x, y: this.boss.y, color: '#ff626c', text: 'VOID PULSE' });
      }
      if (!live.length) this.remaining = 0;
    }
    if (this.event === 'NO RESPAWN' && live.length <= 1) this.remaining = 0;
    if (this.save.settings.hazards) {
      this.hazardClock += dt;
      if (this.hazardClock >= CONFIG.combat.hazardInterval && !this.hazard) { this.hazardClock = 0; this.hazard = { x: 180 + this.random() * 600, y: 310 + this.random() * 180, radius: this.arena.hazardRadius, timer: 2, active: false }; }
      if (this.hazard) {
        this.hazard.timer -= dt;
        if (this.hazard.timer <= 0 && !this.hazard.active) {
          this.hazard.active = true; this.hazard.timer = 0.5;
          this.emit({ kind: 'hazard', x: this.hazard.x, y: this.hazard.y, color: this.arena.color, text: this.arena.hazard });
          live.filter(f => Math.hypot(f.x - this.hazard!.x, f.y - this.hazard!.y) < this.hazard!.radius).forEach(f => this.damage(f, this.arena.hazardDamage * CONFIG.combat.difficulty, null, this.arena.hazard));
        } else if (this.hazard.timer <= 0) this.hazard = null;
      }
    } else this.hazard = null;
  }
  private attack(attacker: Fighter, target: Fighter, special: boolean) {
    if (target.health <= 0 || target.invulnerable > 0) return;
    if (this.random() < target.dodge) { this.emit({ kind: 'hit', x: target.x, y: target.y, color: '#c2d8e5', text: 'DODGE' }); target.x = Math.max(CONFIG.bounds.left, Math.min(CONFIG.bounds.right, target.x + (this.random() - 0.5) * 45)); return; }
    const critical = this.random() < attacker.critical + WEAPONS[attacker.weapon].critical;
    const blocked = this.random() < target.defense / 240;
    const rage = attacker.class === 'Berserker' ? 1 + (1 - attacker.health / attacker.maxHealth) * 0.7 : 1;
    let amount = attacker.attack * WEAPONS[attacker.weapon].damage * CONFIG.combat.damageScale * (0.8 + this.random() * CONFIG.combat.randomness) * (1 - target.defense / 130) * rage;
    amount *= (critical ? 1.7 : 1) * (special ? 2 : 1) * (blocked ? 0.25 : 1) * (this.event === 'SUDDEN DEATH' ? 2.2 : 1);
    attacker.roundDamage += Math.min(target.health, amount);
    this.emit({ kind: 'hit', x: target.x, y: target.y, sourceX: attacker.x, sourceY: attacker.y, ranged: attacker.class === 'Gunner', color: critical ? '#ffe778' : attacker.color, amount: Math.round(amount), critical, text: blocked ? 'BLOCK' : undefined, fighterId: attacker.id });
    this.damage(target, amount, attacker);
  }
  private attackBoss(attacker: Fighter, special: boolean) {
    if (!this.boss) return;
    const amount = attacker.attack * CONFIG.combat.damageScale * (0.7 + this.random() * 0.5) * (special ? 2 : 1);
    attacker.roundDamage += Math.min(this.boss.health, amount);
    this.boss.health = Math.max(0, this.boss.health - amount); this.boss.hurtFlash = 0.12;
    this.emit({ kind: 'hit', x: this.boss.x, y: this.boss.y - 30, sourceX: attacker.x, sourceY: attacker.y, ranged: attacker.class === 'Gunner', amount: Math.round(amount), color: attacker.color });
    if (this.boss.health <= 0) { this.emit({ kind: 'kill', x: this.boss.x, y: this.boss.y, color: '#ff626c', text: 'OVERLORD DEFEATED' }); this.remaining = Math.min(this.remaining, 0.8); }
  }
  private damage(target: Fighter, amount: number, killer: Fighter | null, hazardName?: string) {
    if (target.health <= 0 || target.invulnerable > 0) return;
    target.health = Math.max(0, target.health - amount); target.hurtFlash = 0.14;
    if (killer) target.x = Math.max(CONFIG.bounds.left, Math.min(CONFIG.bounds.right, target.x + killer.facing * 8));
    else this.emit({ kind: 'hit', x: target.x, y: target.y, color: '#ff7878', amount: Math.round(amount) });
    if (target.health > 0) return;
    target.deaths++; target.recentDeaths++; target.streak = 0; target.respawn = CONFIG.combat.respawn;
    if (killer) {
      killer.kills++; killer.roundKills++; killer.streak++; killer.longestStreak = Math.max(killer.streak, killer.longestStreak);
      if (killer.streak >= 3) this.addFeed(`${killer.name} is on a ${killer.streak} kill streak`, 'The arena has a new problem.', killer.color, 'streak');
      const underdogLeading = killer.odds >= 8 && killer.roundKills >= Math.max(...this.fighters.map(f => f.roundKills));
      this.audience.signal({ kind: killer.streak >= 3 ? 'streak' : underdogLeading ? 'upset' : 'kill', fighter: killer.name, victim: target.name, odds: killer.odds });
    }
    this.addFeed(`${killer?.name ?? hazardName ?? 'THE ARENA'} eliminated ${target.name}`, ['BOSS INVASION', 'NO RESPAWN'].includes(this.event) ? 'Out for this round' : `Reconstructing in ${CONFIG.combat.respawn}s`, killer?.color ?? '#ff7878', 'kill');
    this.emit({ kind: 'kill', x: target.x, y: target.y, color: target.color, text: `${killer?.name ?? 'ARENA'} → ${target.name}`, fighterId: target.id });
    this.slowMotion = 0.45;
  }
  private resurrect(f: Fighter) {
    f.health = f.maxHealth; f.respawn = 0; f.invulnerable = CONFIG.combat.invulnerability;
    f.x = 130 + this.random() * 700; f.y = 305 + this.random() * 200;
    f.cooldown = 0.8;
    if (this.phase === 'rumble') this.addFeed(`${f.name} is back in the fight`, 'Reconstruction complete.', f.color, 'respawn');
    this.emit({ kind: 'respawn', x: f.x, y: f.y, color: f.color, fighterId: f.id });
  }
  private finishRound() {
    const rank = [...this.fighters].sort((a, b) => {
      if (this.event === 'BOSS INVASION') return b.roundDamage - a.roundDamage;
      if (this.event === 'NO RESPAWN' && (a.health > 0) !== (b.health > 0)) return b.health - a.health;
      return b.roundKills - a.roundKills || b.roundDamage - a.roundDamage || b.health - a.health;
    });
    this.winner = rank[0].id;
    this.fighters.forEach(f => {
      const won = f.id === this.winner;
      if (won) f.wins++; else f.losses++;
      f.recent.push(won); f.recent = f.recent.slice(-10);
    });
    const damageWinner = [...this.fighters].sort((a, b) => b.roundDamage - a.roundDamage)[0].id;
    const survivor = [...this.fighters].sort((a, b) => b.aliveTime - a.aliveTime || b.health - a.health)[0].id;
    const teamWinner = this.boss && this.boss.health > 0 ? 'boss' : 'fighters';
    const outcomes = { winner: this.winner, team: teamWinner, damage: damageWinner, survival: survivor };
    for (const p of this.save.predictions.filter(p => p.round === this.round && p.status === 'pending')) {
      const payout = settlePrediction(this.save, p, predictionWon(p, outcomes));
      this.addFeed(payout ? `Prediction won · +${money(payout)}` : `Prediction lost · ${money(p.amount)}`, `${p.fighterName} · ${p.odds.toFixed(2)}×`, payout ? '#d8fa42' : '#f58087', 'payout');
      this.emit({ kind: 'payout', x: 480, y: 300, color: payout ? '#d8fa42' : '#f58087', amount: payout - p.amount });
      if (payout) this.achievement('Called it');
      if (payout && p.odds >= 8) this.achievement('Underdog believer');
    }
    this.audience.settle(outcomes, rank[0], this.save.predictions.find(p => p.round === this.round));
    this.save.balance = roundMoney(this.save.balance + CONFIG.economy.spectatorReward);
    this.save.transactions.unshift({ id: `watch-${this.round}-${Date.now()}`, label: `Round ${this.round} spectator reward`, amount: CONFIG.economy.spectatorReward, time: Date.now() });
    this.save.transactions = this.save.transactions.slice(0, 100);
    this.save.roundsWatched++;
    if (this.save.roundsWatched >= 10) this.achievement('Arena regular');
    this.addFeed(this.boss ? `${teamWinner === 'boss' ? 'The Overlord' : 'The fighters'} wins` : `${rank[0].name} takes the crown`, this.boss ? `Top damage: ${rank[0].name} · +${money(CONFIG.economy.spectatorReward)} in-game reward` : `${rank[0].roundKills} eliminations · +${money(CONFIG.economy.spectatorReward)} in-game reward`, rank[0].color, 'winner');
    this.hazard = null;
    this.persist();
  }
}
