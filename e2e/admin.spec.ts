import { expect, test } from '@playwright/test';
import { mockApi, signIn } from './fixtures/api-mock';

const REPORT = {
  uuid: 'rep-1', reference: 'RA-2026-000008', title: "Rapport d'activité DocTrack — National", scope: 'national',
  period: { from: '2026-08-01', to: '2026-08-31', label: 'Août 2026' }, level: 'à surveiller', score: 68, alerts_count: 1, automatic: true,
  pdf_url: 'x', xlsx_url: 'x', created_at: '2026-09-01T06:00:00Z', delivered_at: null, narrative_status: 'pending',
  analysis: { score: 68, level: 'à surveiller', summary: 'Août 2026 : 131 déclarations au guichet.', alerts: [], positives: [], recommendations: [] },
  narrative: {
    summary_fr: 'En août 2026, 131 déclarations ont été enregistrées au guichet et 35 documents restitués.',
    highlights: ['131 déclarations'], recommendations: [{ priority: 'haute', text: 'Relancer Pikine.' }], provider: 'qwen', model: 'qwen-plus', verified: true,
  },
  narrative_review: { reviewed_at: null, note: null, attempts: [{ provider: 'qwen', model: 'qwen-plus', ok: true }] },
};

test.describe('Espace super admin', () => {
  test('validation d’une synthèse IA corrigée : seules les corrections sont envoyées', async ({ page }) => {
    await signIn(page, 'admin');
    const calls = await mockApi(page, {
      profile: 'admin',
      overrides: {
        'v2/reports/rep-1/narrative/approve': { ...REPORT, narrative_status: 'approved', delivered_at: '2026-10-01T09:00:00Z' },
        'v2/reports/rep-1': REPORT,
      },
    });
    await page.goto('/admin/rapports/rep-1');
    const fr = page.getByLabel('Synthèse (français)');
    await expect(fr).toHaveValue(/131 déclarations/);
    await fr.fill('Synthèse relue : 131 déclarations au guichet et 35 restitutions en août 2026.');
    await page.getByRole('button', { name: 'Valider et envoyer' }).click();
    await page.getByRole('button', { name: 'Valider et envoyer' }).last().click(); // confirmation
    await expect(page.locator('app-narrative-review').getByText('Validée', { exact: true })).toBeVisible();

    const approve = calls.find((c) => c.path === 'v2/reports/rep-1/narrative/approve');
    expect(approve?.body).toEqual({ summary_fr: 'Synthèse relue : 131 déclarations au guichet et 35 restitutions en août 2026.' });
  });

  test('les anciens écrans s’affichent dans la nouvelle mise en page', async ({ page }) => {
    await signIn(page, 'admin');
    await mockApi(page, { profile: 'admin' });
    await page.goto('/admin/adminpub');
    await expect(page.getByRole('complementary', { name: "Menu de l'administration" })).toBeAttached();
    await expect(page.getByRole('link', { name: 'Publications' })).toHaveClass(/active/);
    // L'ancien écran « Rapports » renvoie vers les rapports V2.
    await page.goto('/admin/adminrapport');
    await expect(page).toHaveURL(/\/admin\/rapports$/);
  });
});
