import type { Plugin } from 'vite';
import { developer } from './src/config/developer';

const title = 'Pixel Rumble | 2D Pixel Auto-Battle Game';
const description = `Watch pixel fighters battle, predict winners, climb simulated leaderboards, and experience a fictional crypto-inspired economy in Pixel Rumble, an interactive 2D auto-battle game by ${developer.name}.`;
const simulation = 'Pixel Rumble is an entertainment project. All betting, balances, audience members, market activity, cryptocurrency prices, winnings, and transactions displayed inside the game are simulated. No real money or cryptocurrency is used.';
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const developerLink = `<a href="${escape(developer.portfolio)}" target="_blank" rel="noopener noreferrer">${escape(developer.name)}</a>`;

export function siteSeo(configuredUrl?: string, indexable = false): Plugin {
  const url = new URL(configuredUrl || 'http://localhost:5174/');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL must be an absolute HTTP(S) origin, without credentials, a path, query, or fragment.');
  }
  const origin = url.href;
  const canIndex = indexable && !!configuredUrl && url.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const absolute = (path: string) => new URL(path, origin).href;
  const robots = `User-agent: *\n${canIndex ? `Allow: /\nSitemap: ${absolute('sitemap.xml')}` : 'Disallow: /'}\n`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${canIndex ? ['', 'about.html'].map(path => `<url><loc>${escape(absolute(path))}</loc></url>`).join('') : ''}</urlset>\n`;
  const footer = `<footer class="site-footer app-shell">
    <div class="footer-credit"><a class="footer-brand" href="/">PIXEL RUMBLE</a><p>Designed &amp; Developed by ${developerLink}</p><small>${developer.roles.map(escape).join(' • ')}</small></div>
    <nav aria-label="Footer navigation"><a href="/">Arena</a><a href="/about.html">About &amp; Credits</a><a href="${escape(developer.portfolio)}" target="_blank" rel="noopener noreferrer">Developer Portfolio ↗</a></nav>
    <p class="footer-disclaimer">Simulated dollars. Fictional spectators. No cash value.</p>
  </footer>`;
  const about = `<main id="main-content" class="about-page">
    <nav aria-label="About navigation"><a href="/">← Back to the arena</a><a href="#credits">Developer credits</a></nav>
    <h1>PIXEL RUMBLE <span>ABOUT &amp; CREDITS</span></h1>
    <p>An experimental 2D pixel-art auto-rumble game featuring automated fighters, simulated betting, fictional audiences, leaderboards, and a simulated crypto-inspired market.</p>
    <section aria-labelledby="what"><h2 id="what">What is Pixel Rumble?</h2><p>Pixel Rumble is an experimental 2D pixel-art auto-battle game where automated fighters compete inside dynamic arenas while spectators follow battles, predict outcomes using simulated dollars, and participate in a completely fictional game economy.</p></section>
    <section aria-labelledby="how"><h2 id="how">How does Pixel Rumble work?</h2><p>Players watch autonomous pixel fighters battle, inspect fighter statistics, compare simulated odds, make fictional predictions, follow simulated audience activity, and track leaderboard performance across multiple rounds.</p></section>
    <section aria-labelledby="money"><h2 id="money">Is Pixel Rumble real-money gambling?</h2><p>No. Pixel Rumble uses simulated balances and fictional betting mechanics for entertainment purposes. No deposits, withdrawals, real-money wagering, or cash prizes are supported.</p><p>${simulation}</p></section>
    <section id="credits" aria-labelledby="who"><h2 id="who">Who developed Pixel Rumble?</h2><p>Pixel Rumble was designed and developed by ${developerLink}, a web developer specializing in web development, WordPress, and SEO.</p><p>${developer.roles.map(escape).join(' • ')}<br>${developer.additionalRoles.map(escape).join(' • ')}</p><p><a href="${escape(developer.portfolio)}" target="_blank" rel="noopener noreferrer">View Portfolio →</a></p></section>
  </main>`;
  return {
    name: 'pixel-rumble-static-seo',
    buildStart() {
      if (!configuredUrl) this.warn('SITE_URL is unset: generating a noindex local preview. Set SITE_URL to the production HTTPS origin for release.');
    },
    transformIndexHtml(html, context) {
      const isAbout = context.filename.endsWith('/about.html');
      const canonical = absolute(isAbout ? 'about.html' : '');
      const pageTitle = isAbout ? 'About & Credits | Pixel Rumble' : title;
      const pageDescription = isAbout ? `Learn how Pixel Rumble works, explore its fictional game economy, and meet its developer and SEO specialist, ${developer.name}.` : description;
      const person = { '@type': 'Person', '@id': `${developer.portfolio}#person`, name: developer.name, url: developer.portfolio, jobTitle: [...developer.roles, ...developer.additionalRoles] };
      const creator = { '@id': person['@id'] };
      const schema = { '@context': 'https://schema.org', '@graph': [
        person,
        { '@type': 'WebSite', '@id': `${origin}#website`, url: origin, name: 'Pixel Rumble', description, inLanguage: 'en', author: creator },
        { '@type': ['VideoGame', 'WebApplication'], '@id': `${origin}#game`, url: origin, name: 'Pixel Rumble', description, creator, author: creator, applicationCategory: 'GameApplication', operatingSystem: 'Web browser', gamePlatform: 'Web browser', genre: ['Auto-battler', 'Pixel-art fighting game'], isAccessibleForFree: true, image: absolute('images/pixel-rumble-social.png') },
        { '@type': isAbout ? 'AboutPage' : 'WebPage', '@id': `${canonical}#page`, url: canonical, name: pageTitle, isPartOf: { '@id': `${origin}#website` }, about: { '@id': `${origin}#game` }, author: creator, inLanguage: 'en' },
      ] };
      const head = `<title>${escape(pageTitle)}</title>
        <meta name="description" content="${escape(pageDescription)}">
        <meta name="author" content="${escape(developer.name)}">
        <meta name="robots" content="${canIndex ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}">
        <link rel="canonical" href="${escape(canonical)}">
        <link rel="author" href="${escape(developer.portfolio)}">
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
        <link rel="manifest" href="/site.webmanifest">
        <meta name="theme-color" content="#0d0f13">
        <meta property="og:title" content="${escape(pageTitle)}">
        <meta property="og:description" content="${escape(pageDescription)}">
        <meta property="og:url" content="${escape(canonical)}">
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="Pixel Rumble">
        <meta property="og:locale" content="en_US">
        <meta property="og:image" content="${escape(absolute('images/pixel-rumble-social.png'))}">
        <meta property="og:image:type" content="image/png">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:image:alt" content="Pixel Rumble — 2D Auto-Battle Arena, with eight pixel fighters in the neon arena.">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${escape(pageTitle)}">
        <meta name="twitter:description" content="${escape(pageDescription)}">
        <meta name="twitter:image" content="${escape(absolute('images/pixel-rumble-social.png'))}">
        <meta name="twitter:image:alt" content="Pixel Rumble — 2D Auto-Battle Arena, with eight pixel fighters in the neon arena.">
        <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
      return html.replace('<!--seo-head-->', head).replace('<!--site-footer-->', footer).replace('<!--about-content-->', about);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/robots.txt' && path !== '/sitemap.xml') return next();
        res.setHeader('Content-Type', path === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8');
        res.end(path === '/robots.txt' ? robots : sitemap);
      });
    },
  };
}
