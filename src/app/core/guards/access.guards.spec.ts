import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, isObservable } from 'rxjs';
import { abilityGuard, authGuard, staffGuard, superAdminGuard } from './access.guards';
import { SessionStore } from '../session/session.store';
import { RedirectService } from '../../components/services/redirection.service';
import { environment } from '../../../environments/environment';

type GuardResult = boolean | UrlTree;

describe('Gardes d’accès', () => {
  let session: SessionStore;
  let router: Router;
  let backend: HttpTestingController;
  const state = { url: '/espace/correspondances' } as RouterStateSnapshot;
  const route = {} as ActivatedRouteSnapshot;

  const run = async (guard: any): Promise<GuardResult> => {
    const result = TestBed.runInInjectionContext(() => guard(route, state)) as GuardResult | Observable<GuardResult>;
    return isObservable(result) ? firstValueFrom(result) : result;
  };
  const target = (r: GuardResult) => (r instanceof UrlTree ? router.serializeUrl(r) : r);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
    backend = TestBed.inject(HttpTestingController);
  });

  it('visiteur → connexion, page demandée retenue', async () => {
    expect(target(await run(authGuard))).toBe('/connexion');
    expect(TestBed.inject(RedirectService).getRedirectUrl()).toBe('/espace/correspondances');
  });

  it('citoyen : pas d’accès à l’administration ni à l’espace structure', async () => {
    session.start({ token: 't', user: { id: 1 }, roles: ['citizen'] });
    expect(await run(authGuard)).toBe(true);
    expect(target(await run(superAdminGuard))).toBe('/accueil');
    expect(target(await run(staffGuard))).toBe('/accueil');
  });

  it('agent : droits chargés avant d’ouvrir l’espace, puis contrôle par droit', async () => {
    session.start({
      token: 't',
      user: { id: 2 },
      organizations: [{ membership_uuid: 'm', role: 'agent', is_primary: true, organization: { uuid: 'o', name: 'Brigade' } }],
    });

    const pending = run(staffGuard);
    backend.expectOne(`${environment.apiUrl}/v2/me/organizations`).flush({
      account_type: 'staff',
      is_super_admin: false,
      active_organization: 'o',
      memberships: [
        { membership_uuid: 'm', role: 'agent', is_primary: true, abilities: ['matches.review'], organization: { uuid: 'o', name: 'Brigade' } },
      ],
    });
    expect(await pending).toBe(true);

    expect(await run(abilityGuard('matches.review'))).toBe(true);
    expect(target(await run(abilityGuard('stats.view')))).toBe('/espace');
  });

  it('super admin : tout est ouvert', async () => {
    session.start({ token: 't', user: { id: 3 }, roles: ['super_admin'] });
    expect(await run(superAdminGuard)).toBe(true);
    expect(await run(staffGuard)).toBe(true);
    expect(await run(abilityGuard('stats.view'))).toBe(true);
  });
});
