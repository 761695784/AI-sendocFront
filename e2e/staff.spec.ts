import { expect, test } from '@playwright/test';
import { mockApi, signIn } from './fixtures/api-mock';

const MESSAGE = {
  uuid: 'msg-1', event: 'collection.sla_reminder', title: 'Retrait sans appel depuis 24 h', body: 'Passeport trouvé au marché Tilène.',
  link: 'collections/col-1', priority: true, is_read: false, organization: { uuid: 'org-1', name: 'Commissariat de Dieuppeul' }, created_at: '2026-09-30T08:00:00Z',
};

const COLLECTION = {
  uuid: 'col-1', status: 'assigned', priority: true, owner_identified_at: null, organization: { uuid: 'org-1', name: 'Commissariat de Dieuppeul' },
  assigned_at: '2026-09-29T08:00:00Z', assignment_reason: 'gps', distance_km: 1.2,
  document: { uuid: 'doc-1', reference: 'TR-2026-000044', document_type: 'Passeport', first_name: 'Moussa', last_name: 'Diop', found_place: 'Marché Tilène', latitude: null, longitude: null, territory: 'Dakar', published_at: '2026-09-29T07:00:00Z', image_url: null },
  finder: { name: 'Fatou Sow', phone: '+221771234567' }, contact_attempts: 0, last_contact_at: null, last_contact_outcome: null,
  method: null, scheduled_at: null, meeting_place: null, pickup_agent: null, collected_at: null, closed_reason: null, history: [], created_at: '2026-09-29',
};

test.describe('Espace des structures', () => {
  test("l'agent ne voit que le guichet ; le responsable voit aussi le pilotage", async ({ page }) => {
    await signIn(page, 'agent');
    await mockApi(page, { profile: 'agent' });
    await page.goto('/espace');
    const menu = page.getByRole('complementary', { name: "Menu de l'espace structure" });
    await expect(menu.getByRole('link', { name: 'Déclarations de perte' })).toBeAttached();
    await expect(menu.getByRole('link', { name: 'Statistiques et délais' })).toHaveCount(0);

    // Accès direct refusé par la garde : retour au tableau de bord.
    await page.goto('/espace/statistiques');
    await expect(page).toHaveURL(/\/espace$/);
  });

  test('message de la boîte de réception → fiche du retrait, message marqué lu', async ({ page }) => {
    let unread = 1;
    await signIn(page, 'manager');
    const calls = await mockApi(page, {
      profile: 'manager',
      overrides: {
        'v2/inbox/unread-count': () => ({ unread }),
        'v2/inbox/msg-1/read': () => {
          unread = 0;
          return { uuid: 'msg-1', is_read: true };
        },
        'v2/inbox': { data: [MESSAGE], current_page: 1, last_page: 1, per_page: 30, total: 1 },
        'v2/collections/col-1': COLLECTION,
      },
    });
    await page.goto('/espace/messages');
    await page.getByRole('button', { name: /Retrait sans appel depuis 24 h/ }).click();
    await expect(page).toHaveURL(/\/espace\/retraits\/col-1$/);
    await expect(page.getByRole('heading', { name: /Retrait — Passeport/ })).toBeVisible();
    expect(calls.some((c) => c.method === 'POST' && c.path === 'v2/inbox/msg-1/read')).toBeTruthy();
  });

  test('statistiques : indicateurs et graphique lisible en tableau', async ({ page }) => {
    await signIn(page, 'manager');
    await mockApi(page, {
      profile: 'manager',
      overrides: {
        'v2/stats/timeseries': { metric: 'counter_declarations', interval: 'week', points: [{ period: '2026-W38', value: 4 }, { period: '2026-W39', value: 8 }] },
        'v2/stats/structures': { data: [] },
        'v2/stats/overdue-collections': { first_contact_hours: 24, data: [] },
      },
    });
    await page.goto('/espace/statistiques');
    await expect(page.getByRole('heading', { name: 'Statistiques et délais' })).toBeVisible();
    await expect(page.getByText('Trouveurs appelés dans le délai')).toBeVisible();
    await page.getByRole('button', { name: 'Voir en tableau' }).click();
    await expect(page.getByRole('cell', { name: 'Semaine 39 (2026)' })).toBeVisible();
  });
});
