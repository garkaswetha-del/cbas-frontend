import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://cbas-frontend-production.up.railway.app',
    headless: false,
    slowMo: 1500,
  },
});
