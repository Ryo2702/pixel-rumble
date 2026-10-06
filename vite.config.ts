import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { siteSeo } from './seo';
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), siteSeo(env.SITE_URL, command === 'build' && mode === 'production' && !['preview', 'development'].includes(env.VERCEL_ENV))],
    build: { rollupOptions: { input: { game: 'index.html', about: 'about.html' }, output: { manualChunks: { pixi: ['pixi.js'], animation: ['gsap', 'motion'] } } } },
  };
});
