import { defineConfig, devices } from '@playwright/test';
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
export default defineConfig({
  testDir: 'tests/scratch',
  timeout: 1_800_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5403/', launchOptions: { args } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, launchOptions: { args } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { args } } },
  ],
});
