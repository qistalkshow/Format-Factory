import { defineConfig, devices } from '@playwright/test';
const base = process.env.BASE_PATH || '/';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://127.0.0.1:4173${base}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // 個別 Windows 快取路徑可能有並列組態問題；允許指定官方乾淨副本。
        launchOptions: process.env.PLAYWRIGHT_FIREFOX_EXECUTABLE_PATH
          ? { executablePath: process.env.PLAYWRIGHT_FIREFOX_EXECUTABLE_PATH }
          : {},
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: `http://127.0.0.1:4173${base}`,
    reuseExistingServer: !process.env.CI,
  },
});
