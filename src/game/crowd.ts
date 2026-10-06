import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { AUDIENCE } from '../config/audience';

export function createCrowd() {
  const layer = new Container(), atlas = document.createElement('canvas');
  atlas.width = 48; atlas.height = 24 * AUDIENCE.colors.length;
  const ctx = atlas.getContext('2d')!;
  AUDIENCE.colors.forEach((color, row) => {
    for (let frame = 0; frame < 3; frame++) {
      ctx.save(); ctx.translate(frame * 16, row * 24);
      ctx.fillStyle = '#0b1120'; ctx.fillRect(5, 6, 7, 8); ctx.fillRect(4, 13, 9, 8);
      ctx.fillStyle = color; ctx.fillRect(6, 7, 5, 4); ctx.fillRect(5, 14, 7, 6);
      ctx.fillStyle = '#c6cad4'; ctx.fillRect(7, 9, 1, 1); ctx.fillRect(10, 9, 1, 1);
      ctx.fillStyle = '#101326'; ctx.fillRect(5, 20, 3, 4); ctx.fillRect(10, 20, 3, 4);
      ctx.fillStyle = color;
      if (frame === 0) { ctx.fillRect(2, 14, 3, 5); ctx.fillRect(12, 14, 3, 5); }
      else { ctx.fillRect(2, 8, 3, 8); ctx.fillRect(12, 8, 3, 8); }
      if (frame === 2) { ctx.fillStyle = '#191b2b'; ctx.fillRect(1, 0, 14, 8); ctx.fillStyle = color; ctx.fillRect(2, 1, 12, 6); ctx.fillStyle = '#151723'; ctx.fillRect(4, 3, 8, 2); }
      ctx.restore();
    }
  });
  const texture = Texture.from(atlas); texture.source.scaleMode = 'nearest';
  const frames = AUDIENCE.colors.map((_, row) => Array.from({ length: 3 }, (_, frame) => new Texture({ source: texture.source, frame: new Rectangle(frame * 16, row * 24, 16, 24) })));
  const pool = Array.from({ length: AUDIENCE.renderedCrowd }, (_, i) => {
    const sprite = new Sprite(frames[i % frames.length][0]); sprite.anchor.set(0.5, 1);
    const side = i >= 60, x = i < 28 ? 140 + i * 25 : i < 60 ? 97 + (i - 28) * 25 : i % 2 ? 48 : 911;
    const y = i < 28 ? 268 : i < 60 ? 598 : 335 + Math.floor((i - 60) / 2) * 26;
    sprite.position.set(x, y); sprite.scale.set(side ? 0.95 : i < 28 ? 0.9 : 1.25); sprite.alpha = 0.62 + (i % 3) * 0.08;
    layer.addChild(sprite); return { sprite, y, frames: frames[i % frames.length], phase: i * 1.73 };
  });
  let pulse = 0;
  return {
    layer,
    cheer(amount = 1) { pulse = Math.min(1.5, pulse + amount); },
    update(dt: number, elapsed: number, excitement: number, reducedMotion: boolean) {
      pulse = Math.max(0, pulse - dt * 0.5);
      const energy = excitement * 0.45 + pulse;
      pool.forEach((person, index) => {
        const wave = Math.sin(elapsed * (3 + energy * 2) + person.phase);
        person.sprite.y = person.y - (reducedMotion ? 0 : Math.max(0, wave) * (1 + energy * 5));
        person.sprite.texture = person.frames[!reducedMotion && energy > 0.4 && wave > 0 ? index % 5 === 0 ? 2 : 1 : 0];
      });
    },
    destroy() { frames.flat().forEach(frame => frame.destroy()); texture.destroy(true); },
  };
}
