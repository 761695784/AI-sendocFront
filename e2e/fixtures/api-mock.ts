import { Page, Route } from '@playwright/test';

/**
 * API DocTrack simulée pour les tests de parcours : données fictives uniquement.
 * Intercepte l'API locale (localhost:8000) et celle de production : le test marche quel que soit l'environnement.
 */
export type Profile = 'anonymous' | 'citizen' | 'agent' | 'manager' | 'admin';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
/** Jeton factice valable une heure (seule l'expiration est lue par l'application). */
export const fakeToken = () => `${b64({ alg: 'HS256' })}.${b64({ sub: 7, exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;

const MANAGER_ABILITIES = [
  'organizations.view', 'organizations.update', 'members.view', 'members.manage', 'stats.view', 'audit.view',
  'declarations.create', 'declarations.view', 'declarations.cancel', 'citizens.search', 'citizens.create',
  'found_documents.create', 'found_documents.view', 'matches.view', 'matches.review', 'collections.view', 'collections.manage',
  'restitutions.view', 'restitutions.perform', 'restitutions.void', 'restitutions.override', 'billing.view', 'billing.collect',
  'billing.exempt', 'vigilance.view', 'vigilance.review',
];
const AGENT_ABILITIES = [
  'organizations.view', 'declarations.create', 'declarations.view', 'citizens.search', 'citizens.create', 'found_documents.create',
  'found_documents.view', 'matches.view', 'matches.review', 'collections.view', 'collections.manage', 'restitutions.view',
  'restitutions.perform', 'billing.collect',
];

export function memberships(profile: Profile) {
  if (profile !== 'agent' && profile !== 'manager') {
    return [];
  }
  return [
    {
      membership_uuid: 'ms-1',
      role: profile === 'manager' ? 'structure_manager' : 'agent',
      is_primary: true,
      abilities: profile === 'manager' ? MANAGER_ABILITIES : AGENT_ABILITIES,
      organization: { uuid: 'org-1', name: 'Commissariat de Dieuppeul', level: 'structure' },
    },
  ];
}

/** Ouvre une session dans le navigateur (localStorage) avant le chargement de l'application. */
export async function signIn(page: Page, profile: Profile): Promise<void> {
  if (profile === 'anonymous') {
    return;
  }
  const roles = profile === 'admin' ? ['super_admin'] : ['citizen'];
  await page.addInitScript(
    ([token, roles, orgs]) => {
      if (sessionStorage.getItem('e2e-init')) {
        return; // une seule fois : les tests peuvent ensuite se déconnecter
      }
      sessionStorage.setItem('e2e-init', '1');
      localStorage.setItem('token', token as string);
      localStorage.setItem('user', JSON.stringify({ id: 7, FirstName: 'Awa', LastName: 'Ndiaye', email: 'awa@example.sn' }));
      localStorage.setItem('roles', roles as string);
      localStorage.setItem('organizations', orgs as string);
    },
    [fakeToken(), JSON.stringify(roles), JSON.stringify(memberships(profile))],
  );
}

export interface MockOptions {
  profile: Profile;
  /** Réponses particulières : clé = début du chemin après /api (ex. 'v2/inbox'), valeur = JSON ou fonction. */
  overrides?: Record<string, unknown | ((route: Route) => unknown)>;
}

const page1 = <T>(data: T[]) => ({ data, current_page: 1, last_page: 1, per_page: 20, total: data.length });

/** Branche l'API simulée. Renvoie la liste des appels reçus (pour vérifier ce que l'écran a envoyé). */
export async function mockApi(page: Page, { profile, overrides = {} }: MockOptions) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  await page.route(/\/api\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*?\/api\//, '');
    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {
      body = req.postData();
    }
    calls.push({ method: req.method(), path, body });
    const json = (data: unknown, status = 200) =>
      route.fulfill({ status, json: data, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });

    if (req.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    }
    for (const [prefix, value] of Object.entries(overrides)) {
      if (path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?')) {
        const result = typeof value === 'function' ? await (value as (r: Route) => unknown)(route) : value;
        if (result !== undefined) {
          return json(result);
        }
        return;
      }
    }
    if (path === 'v2/me/organizations') {
      return json({ account_type: profile, is_super_admin: profile === 'admin', active_organization: profile === 'agent' || profile === 'manager' ? 'org-1' : null, memberships: memberships(profile) });
    }
    if (path === 'v2/inbox/unread-count') {
      return json({ unread: 0 });
    }
    if (path === 'document-types') {
      return json([{ id: 1, TypeName: "Carte nationale d'identité" }, { id: 2, TypeName: 'Passeport' }]);
    }
    if (path.startsWith('v2/stats/overview')) {
      return json(OVERVIEW);
    }
    if (req.method() === 'GET') {
      return json(page1([]));
    }
    return json({});
  });
  return calls;
}

export const OVERVIEW = {
  scope: { level: 'structure', organization: { uuid: 'org-1', name: 'Commissariat de Dieuppeul' }, structures: 1 },
  period: { from: '2026-09-01', to: '2026-09-30' },
  declarations: { counter: 12, cancelled: 0, online: null },
  found_documents: { deposited_at_counter: 5, collected_from_finders: 2, published_online: null, in_custody_now: 7, custody_age: { under_30_days: 6, '30_to_90_days': 1, over_90_days: 0 }, entered_custody: 7, restitution_rate_pct: 42.9 },
  matches: { created: 4, auto_confirmed: 2, confirmed_by_agents: 1, rejected: 0, pending_review_now: 1, overdue_reviews_now: 0, median_review_hours: 3 },
  collections: { assigned: 3, median_first_contact_hours: 2, contacted_within_sla_pct: 100, collected: 2, median_hours_to_collect: 20, cancelled: 0, open_now: 1, overdue_now: 0 },
  restitutions: { completed: 3, voided: 0, by_proxy: 1, without_prior_declaration: 0, name_derogations: 0, median_days_in_custody: 2 },
  sms: { sent: 20, failed: 0, skipped: 0 },
  sla: { first_contact_hours: 24, escalate_hours: 48, collection_hours: 72, review_hours: 48 },
};
