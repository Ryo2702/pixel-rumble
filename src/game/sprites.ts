import type { FighterConfig } from '../types';

export const SPRITE_WIDTH = 28, SPRITE_HEIGHT = 32;
const avatars = new Map<string, string>();
export function drawFighter(ctx: CanvasRenderingContext2D, fighter: FighterConfig, frame = 0) {
  const c = fighter.color, type = fighter.appearance;
  const skin = ['#d6b8d7', '#e0ae87', '#b8a5ca', '#c2cfe0', '#c4cab6', '#eac2b6', '#a5dbca', '#d0b5b3'][type];
  const dark = '#20202e', mid = '#414054', light = '#edf0ee';
  const rect = (x: number, y: number, w: number, h: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const step = frame === 1 ? 2 : frame === 3 ? -2 : 0;
  const bob = frame % 2;
  ctx.save(); ctx.translate(0, -bob);
  // A shared pixel silhouette with class-specific armor, masks, hair, and weapons.
  rect(7, 12, 13, 13, dark);
  rect(8, 24, 5, 5 + step, dark); rect(15, 24, 5, 5 - step, dark);
  rect(7, 28 + step, 6, 3, mid); rect(15, 28 - step, 7, 3, mid);
  rect(8, 13, 11, 10, c); rect(10, 16, 7, 8, mid);
  rect(9, 21, 9, 2, c); rect(11, 22, 3, 2, '#eee1b9');
  rect(5, 14, 4, 9, dark); rect(18, 14, 4, 9, dark);
  rect(4, 14, 5, 4, c); rect(18, 14, 5, 4, c);
  rect(5, 19, 3, 4, skin); rect(19, 19, 3, 4, skin);
  rect(8, 3, 11, 11, dark); rect(7, 5, 13, 7, dark);
  rect(9, 5, 9, 7, skin); rect(10, 6, 7, 3, dark);
  rect(10, 7, 2, 2, c); rect(15, 7, 2, 2, c);
  rect(9, 3, 9, 3, c); rect(10, 2, 6, 1, c);
  if (type === 0 || type === 5) {
    rect(8, 2, 11, 3, dark); rect(7, 5, 13, 2, c); rect(4, 6, 4, 2, c);
    rect(2, 7, 3, 2, c); rect(9, 10, 9, 3, dark); rect(11, 10, 5, 1, c);
    rect(22, 6, 2, 13, light); rect(24, 4, 1, 10, c); rect(20, 19, 6, 2, c); rect(22, 21, 2, 4, mid);
    if (type === 5) { rect(7, 0, 10, 4, c); rect(5, 2, 3, 9, c); rect(2, 15, 2, 8, light); }
  } else if (type === 1) {
    rect(9, 1, 8, 3, '#f59755'); rect(11, 0, 5, 2, '#f59755');
    rect(2, 17, 7, 7, c); rect(19, 17, 7, 7, c); rect(2, 17, 7, 2, '#ffe0a3'); rect(19, 17, 7, 2, '#ffe0a3');
    rect(10, 13, 7, 6, skin); rect(12, 16, 2, 2, dark);
  } else if (type === 2 || type === 7) {
    rect(8, 2, 11, 4, c); rect(6, 5, 3, 10, c); rect(18, 5, 3, 10, c);
    rect(8, 11, 11, 3, dark); rect(3, 21, 5, 6, c); rect(20, 20, 3, 7, c);
    if (type === 7) { rect(23, 3, 2, 26, '#797389'); rect(19, 3, 8, 7, c); rect(20, 5, 6, 3, light); }
    else { rect(3, 17, 2, 9, '#eecaff'); rect(23, 17, 2, 9, '#eecaff'); }
  } else if (type === 4) {
    rect(6, 2, 15, 12, mid); rect(7, 3, 13, 8, c); rect(8, 7, 11, 3, dark); rect(10, 8, 7, 1, '#edffd0');
    rect(3, 13, 20, 5, c); rect(3, 14, 4, 10, mid); rect(20, 14, 4, 10, mid);
    rect(23, 12, 2, 18, '#9f9676'); rect(20, 8, 8, 7, c); rect(21, 9, 6, 2, light);
  } else {
    rect(7, 3, 13, 9, mid); rect(8, 5, 11, 4, c); rect(9, 6, 9, 2, '#c5faff');
    rect(18, 17, 10, 4, mid); rect(22, 16, 6, 3, c); rect(26, 18, 2, 2, light);
    rect(4, 15, 3, 10, mid); rect(3, 16, 2, 6, c);
    if (type === 6) { rect(12, 0, 2, 4, c); rect(10, 0, 6, 1, c); rect(11, 14, 4, 4, c); }
  }
  rect(9, 14, 2, 2, light);
  ctx.restore();
}
export function avatarUrl(fighter: FighterConfig): string {
  if (avatars.has(fighter.id)) return avatars.get(fighter.id)!;
  const canvas = document.createElement('canvas'); canvas.width = SPRITE_WIDTH; canvas.height = SPRITE_HEIGHT;
  drawFighter(canvas.getContext('2d')!, fighter);
  const url = canvas.toDataURL(); avatars.set(fighter.id, url); return url;
}
