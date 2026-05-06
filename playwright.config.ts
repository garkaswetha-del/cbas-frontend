import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://cbas-frontend.onrender.com',
    headless: false,
    slowMo: 500,
  },
});
