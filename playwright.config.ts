import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'https://cbas-frontend-production.up.railway.app',
    headless: false,
    slowMo: 500,
  },
});
