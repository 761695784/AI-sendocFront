import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SessionStore } from './session.store';
import { LoginResponse, Membership } from './session.models';
import { environment } from '../../../environments/environment';

const commissariat = (uuid: string, primary = false, abilities?: string[]): Membership => ({
  membership_uuid: `m-${uuid}`,
  role: 'agent',
  is_primary: primary,
  abilities,
  organization: { uuid, name: `Commissariat ${uuid}` },
});

const login = (over: Partial<LoginResponse> = {}): LoginResponse => ({
  token: 'jeton',
  user: { id: 7, FirstName: 'Awa', LastName: 'Ndiaye', roles: [{ name: 'citizen' }] },
  roles: ['citizen', 'SimpleUser'],
  organizations: [],
  ...over,
});

describe('SessionStore', () => {
  let store: SessionStore;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('citoyen : session enregistrée avec les anciennes clés, accueil public', () => {
    store.start(login());

    expect(store.isAuthenticated()).toBe(true);
    expect(store.isCitizen()).toBe(true);
    expect(store.displayName()).toBe('Awa Ndiaye');
    expect(store.homeUrl()).toBe('/accueil');
    expect(localStorage.getItem('token')).toBe('jeton');
    expect(localStorage.getItem('userId')).toBe('7');
    expect(JSON.parse(localStorage.getItem('user')!).FirstName).toBe('Awa');
  });

  it('super admin reconnu par ses rôles V2 → /admin', () => {
    store.start(login({ roles: ['super_admin', 'Admin'], user: { id: 1, roles: [{ name: 'super_admin' }] } }));
    expect(store.isSuperAdmin()).toBe(true);
    expect(store.can('n’importe.quoi')).toBe(true);
    expect(store.homeUrl()).toBe('/admin');
  });

  it('vérification e-mail : jeton reçu sous « access_token »', () => {
    store.start({ access_token: 'autre', user: { id: 3 } });
    expect(store.token()).toBe('autre');
  });

  it('agent : structure principale active par défaut, puis structure choisie', () => {
    store.start(login({ organizations: [commissariat('A'), commissariat('B', true)] }));

    expect(store.isStaff()).toBe(true);
    expect(store.homeUrl()).toBe('/espace');
    expect(store.activeOrganization()?.uuid).toBe('B');

    store.setActiveOrganization('A');
    expect(store.activeOrganization()?.uuid).toBe('A');
    expect(localStorage.getItem('active_organization')).toBe('A');
  });

  it('droits de la structure active chargés depuis /v2/me/organizations', () => {
    store.start(login({ organizations: [commissariat('A', true)] }));
    expect(store.needsMembershipDetails()).toBe(true);
    expect(store.can('matches.review')).toBe(false);

    let result: Membership[] = [];
    store.loadMemberships().subscribe((list) => (result = list));
    http.expectOne(`${environment.apiUrl}/v2/me/organizations`).flush({
      account_type: 'staff',
      is_super_admin: false,
      active_organization: 'A',
      memberships: [commissariat('A', true, ['matches.view', 'matches.review'])],
    });

    expect(result.length).toBe(1);
    expect(store.needsMembershipDetails()).toBe(false);
    expect(store.can('matches.review')).toBe(true);
    expect(store.canAny(['stats.view', 'matches.view'])).toBe(true);
    expect(store.can('stats.view')).toBe(false);
  });

  it('structure mémorisée devenue invalide : oubliée', () => {
    localStorage.setItem('active_organization', 'ANCIENNE');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);

    store.start(login({ organizations: [commissariat('A', true)] }));
    expect(store.activeOrganization()?.uuid).toBe('A');
    expect(localStorage.getItem('active_organization')).toBeNull();
  });

  it('déconnexion : tout est effacé', () => {
    store.start(login());
    store.clear();
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('renouvellement du jeton : un seul appel, nouveau jeton enregistré', () => {
    store.start(login());
    store.refreshToken().subscribe();
    store.refreshToken().subscribe();
    http.expectOne(`${environment.apiUrl}/refresh`).flush({ success: true, token: 'neuf' });
    expect(store.token()).toBe('neuf');
    expect(localStorage.getItem('token')).toBe('neuf');
  });
});
