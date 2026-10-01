import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/api-mock';

/** Pages publiques : accessibles sans compte, en français, sans erreur. */
test.describe('Pages publiques', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page, { profile: 'anonymous' });
  });

  test("l'accueil s'affiche en français, avec un titre de page", async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page).toHaveTitle(/DocTrack/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    expect(errors).toEqual([]);
  });

  test('une adresse inconnue affiche la page « introuvable »', async ({ page }) => {
    await page.goto('/cette-page-nexiste-pas');
    await expect(page.getByRole('heading', { name: "Cette page n'existe pas" })).toBeVisible();
    await page.getByRole('link', { name: 'Vérifier un certificat' }).click();
    await expect(page).toHaveURL(/\/verifier$/);
  });

  test("vérification d'un certificat authentique", async ({ page }) => {
    await mockApi(page, {
      profile: 'anonymous',
      overrides: {
        'v2/verify': {
          found: true, status: 'valid', type: 'certificate', kind: 'official', kind_label: 'Certificat officiel', certificate_number: 'CP-2026-000045',
          issued_at: '2026-09-30T09:00:00Z', issued_by: { structure: 'Commissariat de Dieuppeul', institution: 'Police nationale' },
          document_types: ["Carte nationale d'identité"], holder_initials: 'A. N.',
        },
      },
    });
    await page.goto('/verifier');
    await page.getByLabel('Code de vérification').fill('8UQU-PLRD-5X77');
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page).toHaveURL(/\/verifier\/8UQU-PLRD-5X77/);
    await expect(page.getByText('CP-2026-000045')).toBeVisible();
  });

  test("le manifeste de l'application installable est valide", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/manifest.webmanifest`);
    expect(res.ok()).toBeTruthy();
    const manifest = await res.json();
    expect(manifest.lang).toBe('fr');
    expect(manifest.start_url).toContain('/');
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBeTruthy();
  });
});

/** Les espaces protégés renvoient vers la connexion. */
test.describe('Accès protégés', () => {
  for (const path of ['/mon-espace', '/espace', '/admin']) {
    test(`${path} sans session → connexion`, async ({ page }) => {
      await mockApi(page, { profile: 'anonymous' });
      await page.goto(path);
      await expect(page).toHaveURL(/\/connexion$/);
    });
  }
});
