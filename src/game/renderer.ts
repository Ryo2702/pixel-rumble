import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { CONFIG } from '../config/game';
import { drawFighter, SPRITE_HEIGHT, SPRITE_WIDTH } from './sprites';
import type { GameEngine } from './engine';
import type { CombatEvent, Fighter } from '../types';
import { ArcadeAudio } from './audio';
import { createCrowd } from './crowd';

type Particle = { sprite: Sprite; life: number; maxLife: number; vx: number; vy: number };
type FloatingText = { text: Text; life: number; maxLife: number; vy: number };
type Projectile = { sprite: Sprite; life: number; x: number; y: number; tx: number; ty: number };
type Actor = { root: Container; sprite: Sprite; health: Graphics; label: Text; ring: Graphics; frames: Texture[]; lastHealth: number };

export async function createArena(host: HTMLDivElement, engine: GameEngine, select: (id: string) => void) {
  const app = new Application();
  await app.init({ resizeTo: host, background: '#10131f', antialias: false, autoDensity: true, resolution: Math.min(window.devicePixelRatio, 2), preference: 'webgl', powerPreference: 'high-performance' });
  host.appendChild(app.canvas);
  app.canvas.setAttribute('aria-label', 'Live automated pixel battle. Select fighters using the fighter roster.');
  app.canvas.setAttribute('role', 'img');
  const world = new Container(); app.stage.addChild(world);
  const background = new Container(), actorsLayer = new Container(), effects = new Container();
  actorsLayer.sortableChildren = true;
  world.addChild(background, actorsLayer, effects);
  const crowd = createCrowd(); world.addChildAt(crowd.layer, 1);
  let selected = 'byte', arenaId = '', disposed = false;
  const audio = new ArcadeAudio(); audio.configure(engine.save.settings);
  let neonTexture: Texture | null = null;
  let neonRequested = false;
  const atlas = document.createElement('canvas'); atlas.width = SPRITE_WIDTH * 4; atlas.height = SPRITE_HEIGHT * engine.fighters.length;
  const ctx = atlas.getContext('2d')!;
  engine.fighters.forEach((f, row) => { for (let frame = 0; frame < 4; frame++) { ctx.save(); ctx.translate(frame * SPRITE_WIDTH, row * SPRITE_HEIGHT); drawFighter(ctx, f, frame); ctx.restore(); } });
  const atlasTexture = Texture.from(atlas); atlasTexture.source.scaleMode = 'nearest';
  const actors = new Map<string, Actor>();
  engine.fighters.forEach((f, row) => {
    const root = new Container(); root.eventMode = 'static'; root.cursor = 'pointer'; root.hitArea = new Rectangle(-35, -90, 70, 100);
    root.on('pointertap', () => { selected = f.id; select(f.id); });
    const frames = Array.from({ length: 4 }, (_, col) => new Texture({ source: atlasTexture.source, frame: new Rectangle(col * SPRITE_WIDTH, row * SPRITE_HEIGHT, SPRITE_WIDTH, SPRITE_HEIGHT) }));
    const shadow = new Graphics().ellipse(0, 0, 23, 6).fill({ color: 0x000000, alpha: 0.48 });
    const ring = new Graphics().ellipse(0, 1, 29, 9).stroke({ color: f.color, width: 1.5, alpha: 0.8 });
    const sprite = new Sprite(frames[0]); sprite.anchor.set(0.5, 1); sprite.scale.set(2.1);
    const health = new Graphics(); health.y = -80;
    const label = new Text({ text: f.name, style: { fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 'bold', fill: '#ffffff', stroke: { color: '#0a0a15', width: 4 } } }); label.anchor.set(0.5); label.y = -91;
    root.addChild(shadow, ring, sprite, health, label); actorsLayer.addChild(root);
    actors.set(f.id, { root, sprite, health, label, ring, frames, lastHealth: -1 });
  });
  const bossArt = new Graphics();
  bossArt.rect(-37, -86, 74, 62).fill('#252033').rect(-30, -93, 60, 44).fill('#55334f').rect(-27, -84, 54, 22).fill('#181525').rect(-19, -77, 13, 8).fill('#ff6477').rect(6, -77, 13, 8).fill('#ff6477').rect(-17, -49, 34, 40).fill('#473049').rect(-43, -52, 21, 37).fill('#b04d70').rect(22, -52, 21, 37).fill('#b04d70').rect(-24, -17, 17, 18).fill('#664758').rect(8, -17, 17, 18).fill('#664758').rect(-43, -101, 12, 29).fill('#d85880').rect(31, -101, 12, 29).fill('#d85880');
  actorsLayer.addChild(bossArt);
  const hazardArt = new Graphics(); background.addChild(hazardArt);
  const particles: Particle[] = Array.from({ length: CONFIG.effects.particlePool }, () => { const sprite = new Sprite(Texture.WHITE); sprite.visible = false; effects.addChild(sprite); return { sprite, life: 0, maxLife: 1, vx: 0, vy: 0 }; });
  const texts: FloatingText[] = Array.from({ length: CONFIG.effects.textPool }, () => { const text = new Text({ text: '', style: { fontFamily: 'Silkscreen, monospace', fontSize: 15, fill: '#fff', stroke: { color: '#10121c', width: 4 } } }); text.anchor.set(0.5); text.visible = false; effects.addChild(text); return { text, life: 0, maxLife: 1, vy: 0 }; });
  const projectiles: Projectile[] = Array.from({ length: CONFIG.effects.projectilePool }, () => { const sprite = new Sprite(Texture.WHITE); sprite.visible = false; sprite.width = 14; sprite.height = 3; effects.addChild(sprite); return { sprite, life: 0, x: 0, y: 0, tx: 0, ty: 0 }; });
  const weather = Array.from({ length: 70 }, () => { const sprite = new Sprite(Texture.WHITE); sprite.tint = 0x9bbdf2; sprite.alpha = 0.2; sprite.width = 1; sprite.height = 9 + Math.random() * 12; sprite.position.set(Math.random() * 960, Math.random() * 620); effects.addChild(sprite); return sprite; });
  const cinematic = new Text({ text: '', style: { fontFamily: 'Silkscreen, monospace', fontSize: 24, fill: '#d6f65c', stroke: { color: '#10121c', width: 5 }, align: 'center' } });
  cinematic.anchor.set(0.5); cinematic.position.set(480, 175); cinematic.alpha = 0; effects.addChild(cinematic);
  const announce = (text: string, color: string) => {
    gsap.killTweensOf(cinematic); cinematic.text = text; cinematic.style.fill = color;
    gsap.fromTo(cinematic, { alpha: 0, y: engine.save.settings.reducedMotion ? 175 : 185 }, { alpha: 1, y: 175, duration: engine.save.settings.reducedMotion ? 0 : 0.2, onComplete: () => { gsap.to(cinematic, { alpha: 0, delay: 1.6, duration: 0.3 }); } });
  };

  function drawBackground() {
    const old = background.removeChildren(); old.forEach(child => { if (child !== hazardArt) child.destroy({ children: true }); });
    arenaId = engine.arena.id;
    if (arenaId === 'neon' && !neonRequested) {
      neonRequested = true;
      void Assets.load<Texture>(new URL('../assets/neon-district.webp', import.meta.url).href).then(texture => {
        if (disposed) return;
        neonTexture = texture; texture.source.scaleMode = 'nearest';
        if (engine.arena.id === 'neon') arenaId = '';
      }).catch(() => { /* Keep the procedural arena playable if the image fails. */ });
    }
    if (arenaId === 'neon' && neonTexture) {
      const image = new Sprite(neonTexture); image.width = CONFIG.width; image.height = CONFIG.height; background.addChild(image);
      background.addChild(new Graphics().rect(0, 0, CONFIG.width, CONFIG.height).fill({ color: '#111321', alpha: 0.14 }));
    } else {
      const g = new Graphics(); background.addChild(g);
      const floor = arenaId === 'forest' ? '#1a2927' : arenaId === 'wasteland' ? '#30272b' : arenaId === 'moon' ? '#222d3e' : '#241c34';
      g.rect(0, 0, 960, 620).fill('#0c1020');
      for (let i = 0; i < 65; i++) g.rect((i * 83 + i * i) % 960, (i * 37) % 250, 2, 2).fill({ color: '#d0c4fa', alpha: 0.5 });
      if (arenaId === 'moon') g.circle(755, 100, 70).fill('#40698c').circle(741, 91, 62).fill('#588cad');
      g.rect(0, 265, 960, 355).fill(floor);
      for (let y = 275; y < 620; y += 35) g.moveTo(0, y).lineTo(960, y).stroke({ color: '#8492b0', alpha: 0.12, width: 1 });
      for (let x = 0; x < 960; x += 55) g.moveTo(x, 265).lineTo(x - 110, 620).stroke({ color: '#8492b0', alpha: 0.12, width: 1 });
      for (let i = 0; i < 12; i++) {
        const x = i * 88 - 20, h = 90 + (i * 51) % 110;
        if (arenaId === 'forest') {
          g.rect(x + 16, 230 - h, 16, h + 45).fill('#28372d');
          g.rect(x - 8, 170 - h, 80, 70).fill('#204038').rect(x + 4, 145 - h, 52, 50).fill('#2e5340');
          g.rect(x + 24, 245, 8, 40).fill('#478859');
        } else {
          g.rect(x, 265 - h, 57, h).fill(arenaId === 'wasteland' ? '#403239' : '#20223a');
          for (let wy = 275 - h; wy < 245; wy += 20) g.rect(x + 10, wy, 5, 5).fill({ color: engine.arena.color, alpha: 0.5 }).rect(x + 33, wy, 5, 5).fill({ color: engine.arena.color, alpha: 0.35 });
        }
      }
      g.rect(70, 267, 820, 4).fill(engine.arena.color).rect(70, 565, 820, 3).fill(engine.arena.color);
      for (const x of [45, 885]) { g.rect(x, 305, 30, 245).fill('#171c25').rect(x + 5, 315, 20, 3).fill(engine.arena.color); }
      for (let i = 0; i < 5; i++) g.rect(100 + i * 174, 575, 75, 35).fill('#181c26').rect(104 + i * 174, 579, 67, 3).fill(engine.arena.color);
    }
    background.addChild(hazardArt);
    if (!engine.save.settings.reducedMotion) gsap.fromTo(background, { alpha: 0.2 }, { alpha: 1, duration: CONFIG.effects.transition });
  }
  function burst(x: number, y: number, color: string, count: number) {
    const density = app.ticker.FPS < 35 ? 0.55 : 1;
    let remaining = Math.round(count * density * engine.save.settings.particles * (engine.save.settings.reducedMotion ? 0.25 : 1));
    for (const p of particles) {
      if (p.life > 0) continue;
      if (remaining-- <= 0) break;
      p.life = p.maxLife = 0.25 + Math.random() * 0.65;
      const angle = Math.random() * Math.PI * 2, speed = 35 + Math.random() * 145;
      p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed - 70;
      p.sprite.position.set(x, y - 25); p.sprite.tint = color; p.sprite.width = p.sprite.height = 2 + Math.round(Math.random() * 4); p.sprite.visible = true; p.sprite.alpha = 1;
    }
  }
  function floatText(x: number, y: number, text: string, color: string, large = false) {
    const item = texts.find(t => t.life <= 0); if (!item) return;
    item.life = item.maxLife = large ? 1.3 : 0.7; item.vy = large ? 27 : 45;
    item.text.text = text; item.text.style.fill = color; item.text.style.fontSize = large ? 15 : 12;
    item.text.position.set(x, y - 66); item.text.visible = true; item.text.alpha = 1;
  }
  function effect(event: CombatEvent) {
    audio.effect(event);
    if (event.kind === 'hit') {
      if (event.critical) crowd.cheer(0.12);
      burst(event.x, event.y, event.color, event.critical ? 16 : 5);
      floatText(event.x + (Math.random() - 0.5) * 20, event.y, event.text ?? `${event.critical ? 'CRIT ' : ''}${event.amount ?? ''}`, event.color, event.critical);
      if (event.sourceX !== undefined && event.sourceY !== undefined) {
        const p = projectiles.find(p => p.life <= 0);
        if (p) { p.life = 0.14; p.x = event.sourceX; p.y = event.sourceY - 30; p.tx = event.x; p.ty = event.y - 30; p.sprite.width = event.ranged ? 14 : 30; p.sprite.height = event.ranged ? 3 : 2; p.sprite.tint = event.color; p.sprite.visible = true; p.sprite.rotation = Math.atan2(p.ty - p.y, p.tx - p.x); }
      }
    }
    if (event.kind === 'kill') {
      crowd.cheer(0.55);
      burst(event.x, event.y, event.color, 60);
      const killer = engine.fighters.find(f => event.text?.startsWith(`${f.name} →`));
      if (killer && killer.streak >= 3) announce(`${killer.name} · ${killer.streak} KILL STREAK`, killer.color);
      if (engine.save.settings.shake && !engine.save.settings.reducedMotion) gsap.fromTo(world, { x: -3, y: 2 }, { x: 0, y: 0, duration: CONFIG.effects.shakeDuration, ease: 'elastic.out(1, 0.1)' });
    }
    if (event.kind === 'respawn') {
      burst(event.x, event.y, event.color, 45);
      const actor = actors.get(event.fighterId ?? '');
      if (actor && !engine.save.settings.reducedMotion) gsap.fromTo(actor.root, { alpha: 0.15 }, { alpha: 1, duration: 0.12, repeat: 4, yoyo: true, onComplete: () => { actor.root.alpha = 1; } });
      floatText(event.x, event.y, 'RECONSTRUCTED', event.color);
    }
    if (event.kind === 'special' || event.kind === 'hazard') { burst(event.x, event.y, event.color, 36); floatText(event.x, event.y, event.text?.toUpperCase() ?? '', event.color, true); }
    if (event.kind === 'phase' && event.text === 'rumble') announce(engine.event === 'BOSS INVASION' ? 'THE OVERLORD HAS ARRIVED' : 'LET THE RUMBLE BEGIN', engine.event === 'BOSS INVASION' ? '#ff839d' : '#d6f65c');
    if (event.kind === 'phase' && event.text === 'betting' && engine.event !== 'STANDARD RUMBLE') announce(engine.event, engine.arena.color);
    if (event.kind === 'phase' && event.text === 'results') {
      crowd.cheer(1.5);
      const winner = engine.fighters.find(f => f.id === engine.winner);
      if (winner) for (let i = 0; i < 5; i++) burst(230 + i * 125, 270, i % 2 ? winner.color : '#d6f65c', 65);
    }
  }
  const unsubscribe = engine.onEffect(effect);
  const activateAudio = () => audio.enable(engine.save.settings);
  document.addEventListener('click', activateAudio);
  document.addEventListener('keydown', activateAudio);
  const resize = () => { app.resize(); world.scale.set(host.clientWidth / CONFIG.width, host.clientHeight / CONFIG.height); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const visibility = () => { if (document.hidden) app.stop(); else app.start(); };
  document.addEventListener('visibilitychange', visibility);
  function updateActor(f: Fighter) {
    const actor = actors.get(f.id)!;
    actor.root.position.set(Math.round(f.x), Math.round(f.y)); actor.root.zIndex = f.y;
    actor.root.visible = f.health > 0;
    actor.sprite.texture = actor.frames[f.moving ? Math.floor(engine.elapsed * 10) % 4 : 0];
    actor.sprite.scale.x = Math.abs(actor.sprite.scale.x) * f.facing;
    actor.sprite.alpha = engine.save.settings.reducedMotion ? 1 : f.hurtFlash > 0 ? 0.55 : f.invulnerable > 0 ? 0.7 + Math.sin(engine.elapsed * 16) * 0.2 : 1;
    actor.sprite.rotation = f.attackFlash > 0 && !engine.save.settings.reducedMotion ? -0.16 * f.facing : 0;
    actor.sprite.blendMode = f.hurtFlash > 0 && !engine.save.settings.reducedMotion ? 'add' : 'normal';
    actor.ring.visible = selected === f.id;
    actor.label.style.fill = selected === f.id ? '#d8fa42' : f.color;
    if (actor.lastHealth !== f.health) {
      actor.lastHealth = f.health;
      actor.health.clear().rect(-22, 0, 44, 5).fill('#080e18').rect(-21, 1, Math.max(0, 42 * f.health / f.maxHealth), 3).fill(f.health / f.maxHealth < 0.3 ? '#f26776' : f.color);
    }
  }
  app.ticker.maxFPS = 60;
  app.ticker.add(ticker => {
    if (disposed) return;
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    engine.update(dt); audio.configure(engine.save.settings); audio.ambient(engine.elapsed, engine.arena.music);
    if (arenaId !== engine.arena.id) drawBackground();
    engine.fighters.forEach(updateActor);
    crowd.update(dt, engine.elapsed, engine.audience.activity.excitement + (engine.event === 'SUDDEN DEATH' && engine.phase === 'rumble' ? 0.8 : 0), engine.save.settings.reducedMotion);
    bossArt.visible = !!engine.boss && engine.boss.health > 0;
    if (engine.boss) { bossArt.position.set(engine.boss.x, engine.boss.y); bossArt.zIndex = engine.boss.y; bossArt.alpha = engine.boss.hurtFlash > 0 ? 0.6 : 1; }
    hazardArt.clear();
    if (engine.hazard) {
      const h = engine.hazard;
      hazardArt.ellipse(h.x, h.y, h.radius, h.radius * 0.45).fill({ color: engine.arena.color, alpha: h.active ? 0.65 : 0.1 + Math.sin(engine.elapsed * 12) * 0.06 }).stroke({ color: engine.arena.color, width: h.active ? 4 : 2 });
      hazardArt.moveTo(h.x - 12, h.y).lineTo(h.x + 12, h.y).moveTo(h.x, h.y - 12).lineTo(h.x, h.y + 12).stroke({ color: engine.arena.color, width: 2 });
      if (h.active) {
        if (arenaId === 'neon' || arenaId === 'dungeon') {
          for (let i = -1; i <= 1; i++) hazardArt.moveTo(h.x + i * 24, h.y - 70).lineTo(h.x + i * 24 + 15, h.y - 30).lineTo(h.x + i * 24 - 6, h.y - 15).lineTo(h.x + i * 24, h.y + 5).stroke({ color: '#eee5ff', width: arenaId === 'dungeon' ? 4 : 2 });
        } else if (arenaId === 'forest') {
          for (let i = 0; i < 8; i++) hazardArt.rect(h.x + Math.sin(i * 5) * 60, h.y - (0.5 - h.timer) * 100 - i * 5, 5, 5).fill({ color: '#b0ef81', alpha: 0.7 });
        } else {
          const fall = (0.5 - h.timer) * 120;
          hazardArt.rect(h.x - 14, h.y - 60 + fall, 28, 25).fill(arenaId === 'moon' ? '#efb381' : '#958179').rect(h.x - 8, h.y - 55 + fall, 9, 8).fill('#dac0a4');
        }
      }
    }
    for (const p of particles) { if (p.life <= 0) continue; p.life -= dt; p.sprite.x += p.vx * dt; p.sprite.y += p.vy * dt; p.vy += 180 * dt; p.sprite.alpha = Math.max(0, p.life / p.maxLife); p.sprite.visible = p.life > 0; }
    for (const t of texts) { if (t.life <= 0) continue; t.life -= dt; t.text.y -= t.vy * dt; t.text.alpha = Math.min(1, Math.max(0, t.life * 3)); t.text.visible = t.life > 0; }
    for (const p of projectiles) { if (p.life <= 0) continue; p.life -= dt; const amount = 1 - p.life / 0.14; p.sprite.position.set(p.x + (p.tx - p.x) * amount, p.y + (p.ty - p.y) * amount); p.sprite.visible = p.life > 0; }
    weather.forEach((drop, i) => { drop.visible = !engine.save.settings.reducedMotion && i < engine.save.settings.particles * 70; if (engine.arena.id === 'neon') { drop.y += dt * 260; drop.x -= dt * 65; drop.height = 12; drop.width = 1; } else { drop.y += dt * 18; drop.x += Math.sin(engine.elapsed + i) * dt * 8; drop.width = drop.height = 2; } if (drop.y > 620) { drop.y = 0; drop.x = Math.random() * 960; } });
  });
  return {
    select(id: string) { selected = id; },
    sound() { audio.enable(engine.save.settings); },
    destroy() { disposed = true; observer.disconnect(); unsubscribe(); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('click', activateAudio); document.removeEventListener('keydown', activateAudio); audio.destroy(); gsap.killTweensOf(world); gsap.killTweensOf(background); gsap.killTweensOf(cinematic); actors.forEach(a => gsap.killTweensOf(a.root)); app.destroy(true, { children: true }); crowd.destroy(); atlasTexture.destroy(true); },
  };
}
