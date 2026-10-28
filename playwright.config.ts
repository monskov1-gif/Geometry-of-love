import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the built game served under the same subpath
// GitHub Pages uses, so broken asset paths fail here first.
const BASE_PATH = '/Geometry-of-love/';
const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // The e2e build = production build + window.__golTest (game/.env.e2e).
  webServer: {
    command: `npx vite build --mode e2e --outDir ../dist-e2e && npx vite preview --outDir ../dist-e2e --port ${PORT} --strictPort --base ${BASE_PATH}`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
