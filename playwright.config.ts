import { defineConfig } from '@playwright/test';
import os from 'node:os';
import { existsSync } from 'node:fs';
import path from 'node:path';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    env: { DATA_DIR: path.join(os.tmpdir(), `re0-e2e-${process.pid}`) },
    timeout: 30_000,
  },
});
