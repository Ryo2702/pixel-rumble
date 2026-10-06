import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'browser.spec.ts', timeout: 90000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true, launchOptions: { executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] } },
});
