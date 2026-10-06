// Run against `npm run dev -- --port 5174`; reuses the game's own artwork.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5174/about.html');
  const assets = await page.evaluate(async () => {
    const { FIGHTERS } = await import('/src/config/game.ts');
    const { drawFighter } = await import('/src/game/sprites.ts');
    const load = async src => { const img = new Image(); img.src = src; await img.decode(); return img; };
    const backdrop = await load('/images/neon-district.png');
    const icon = await load('/favicon.svg');
    await document.fonts.load('72px Silkscreen');
    await document.fonts.load('20px "Space Mono"');
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(backdrop, 0, 0, 1200, 630);
    ctx.fillStyle = '#0d0f13bb'; ctx.fillRect(0, 0, 1200, 630);
    ctx.strokeStyle = '#d6f65c'; ctx.lineWidth = 3; ctx.strokeRect(28, 28, 1144, 574);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d6f65c'; ctx.font = '20px "Space Mono"';
    ctx.fillText('EIGHT FIGHTERS. ENDLESS CHAOS.', 600, 94);
    ctx.fillStyle = '#f0f1f5'; ctx.font = '72px Silkscreen';
    ctx.fillText('PIXEL RUMBLE', 600, 190);
    ctx.fillStyle = '#d6f65c'; ctx.font = '25px "Space Mono"';
    ctx.fillText('2D AUTO-BATTLE ARENA', 600, 248);
    FIGHTERS.forEach((fighter, i) => {
      ctx.save(); ctx.translate(71 + i * 134, 317); ctx.scale(4, 4); drawFighter(ctx, fighter); ctx.restore();
      ctx.fillStyle = fighter.color; ctx.font = '14px "Space Mono"'; ctx.fillText(fighter.name, 127 + i * 134, 474);
    });
    ctx.fillStyle = '#e0e3ec'; ctx.font = '17px "Space Mono"';
    ctx.fillText('WATCH · PREDICT · RUMBLE', 600, 539);
    ctx.fillStyle = '#b4bccc'; ctx.font = '13px "Space Mono"';
    ctx.fillText('FICTIONAL ECONOMY. NO REAL MONEY.', 600, 570);
    const result = { 'public/images/pixel-rumble-social.png': canvas.toDataURL('image/png') };
    // Re-encode the existing arena without changing its dimensions or artwork.
    canvas.width = backdrop.naturalWidth; canvas.height = backdrop.naturalHeight;
    ctx.drawImage(backdrop, 0, 0);
    result['src/assets/neon-district.webp'] = canvas.toDataURL('image/webp', 0.9);
    for (const size of [32, 180, 192, 512]) {
      canvas.width = canvas.height = size;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(icon, 0, 0, size, size);
      result[`public/icons/${size === 180 ? 'apple-touch-icon' : `icon-${size}`}.png`] = canvas.toDataURL('image/png');
    }
    return result;
  });
  await mkdir('public/icons', { recursive: true });
  await mkdir('src/assets', { recursive: true });
  for (const [path, data] of Object.entries(assets)) {
    await writeFile(path, Buffer.from(data.split(',')[1], 'base64'));
    console.log(path);
  }
} finally {
  await browser.close();
}
