import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de parcours (navigateur réel) : npx playwright test
 * - l'API est simulée (e2e/fixtures/api-mock.ts) : aucun serveur Laravel ni donnée réelle n'est nécessaire ;
 * - par défaut, l'application est lancée avec `ng serve` sur le port 4300 ;
 * - E2E_BASE_URL=http://localhost:4000 pour tester une version déjà construite (npm run serve:ssr).
 * Première fois sur un poste : npx playwright install chromium
 */
const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4300';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    locale: 'fr-FR',
    serviceWorkers: 'block', // le service worker intercepterait les appels simulés
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
    { name: 'telephone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env['E2E_BASE_URL']
    ? undefined
    : { command: 'npx ng serve --port 4300', url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
