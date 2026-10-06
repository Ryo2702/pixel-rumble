import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build, createServer } from 'vite';
import { siteSeo } from '../seo';
import { developer } from '../src/config/developer';

test('production HTML exposes credits and linked structured data before JavaScript runs', async () => {
  const result = await build({
    configFile: false, logLevel: 'silent', plugins: [siteSeo('https://pixel-rumble.test/', true)],
    build: { write: false, rollupOptions: { input: { game: 'index.html', about: 'about.html' } } },
  });
  assert.ok(!Array.isArray(result) && 'output' in result);
  const asset = (name: string) => {
    const file = result.output.find(file => file.fileName === name);
    assert.ok(file && file.type === 'asset', `Missing ${name}`);
    return String(file.source);
  };
  for (const path of ['index.html', 'about.html']) {
    const html = asset(path);
    assert.match(html, /name="robots" content="index, follow, max-image-preview:large"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    assert.ok(html.includes(`name="author" content="${developer.name}"`));
    const canonical = `https://pixel-rumble.test/${path === 'index.html' ? '' : path}`;
    assert.ok(html.includes(`rel="canonical" href="${canonical}"`));
    assert.ok(html.includes(`property="og:url" content="${canonical}"`));
    assert.doesNotMatch(html, /<!--(?:seo-head|site-footer|about-content)-->/);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
    const graph = schema['@graph'];
    const person = graph.find((node: { '@type': string }) => node['@type'] === 'Person');
    assert.equal(person.name, developer.name);
    assert.equal(person.url, developer.portfolio);
    assert.deepEqual(person.jobTitle, [...developer.roles, ...developer.additionalRoles]);
    const game = graph.find((node: { '@type': string[] }) => Array.isArray(node['@type']));
    assert.deepEqual(game['@type'], ['VideoGame', 'WebApplication']);
    assert.equal(game.creator['@id'], person['@id']);
    assert.equal(graph.find((node: { '@type': string }) => node['@type'] === 'WebSite').author['@id'], person['@id']);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  }
  assert.match(asset('about.html'), /No deposits, withdrawals, real-money wagering, or cash prizes/);
  assert.doesNotMatch(asset('index.html'), /<link[^>]+rel="modulepreload"[^>]+(?:pixi|renderer|Dialogs)/);
  assert.doesNotMatch(asset('about.html'), /<script[^>]+(?:src=|type="module")/);
  assert.match(asset('robots.txt'), /Sitemap: https:\/\/pixel-rumble.test\/sitemap.xml/);
  assert.match(asset('sitemap.xml'), /<loc>https:\/\/pixel-rumble.test\/about.html<\/loc>/);
  const manifest = JSON.parse(await readFile('public/site.webmanifest', 'utf8'));
  for (const icon of manifest.icons) assert.ok((await readFile(`public${icon.src}`)).length > 0);
  const social = await readFile('public/images/pixel-rumble-social.png');
  assert.equal(social.readUInt32BE(16), 1200);
  assert.equal(social.readUInt32BE(20), 630);
});

test('unconfigured previews are noindex and malformed site origins are rejected', async () => {
  for (const url of ['javascript:alert(1)', 'https://example.test/subpath', 'https://user:pass@example.test/', 'https://example.test/?x=1']) {
    assert.throws(() => siteSeo(url, true));
  }
  const server = await createServer({ configFile: false, logLevel: 'silent', plugins: [siteSeo()], server: { middlewareMode: true } });
  try {
    const html = await server.transformIndexHtml('/', await readFile('index.html', 'utf8'));
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.ok(html.includes(developer.name));
  } finally {
    await server.close();
  }
});
