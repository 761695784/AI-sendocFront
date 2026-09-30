import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { organizationInterceptor } from './organization.interceptor';
import { errorInterceptor } from './error.interceptor';
import { SessionStore } from '../session/session.store';
import { RedirectService } from '../../components/services/redirection.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

describe('Intercepteurs HTTP', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let session: SessionStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor, organizationInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => backend.verify());

  it('ajoute le jeton aux appels de l’API seulement', () => {
    session.start({ token: 'abc', user: { id: 1 } });

    http.get(`${API}/v2/declarations`).subscribe();
    http.get('https://tuiles.exemple.org/carte.json').subscribe();

    expect(backend.expectOne(`${API}/v2/declarations`).request.headers.get('Authorization')).toBe('Bearer abc');
    expect(backend.expectOne('https://tuiles.exemple.org/carte.json').request.headers.has('Authorization')).toBe(false);
  });

  it('pas de jeton sur la connexion', () => {
    session.start({ token: 'abc', user: { id: 1 } });
    http.post(`${API}/login`, {}).subscribe();
    expect(backend.expectOne(`${API}/login`).request.headers.has('Authorization')).toBe(false);
  });

  it('en-tête X-Organization pour un agent, absent pour un citoyen', () => {
    session.start({ token: 'abc', user: { id: 1 } });
    http.get(`${API}/v2/matches`).subscribe();
    expect(backend.expectOne(`${API}/v2/matches`).request.headers.has('X-Organization')).toBe(false);

    session.start({
      token: 'abc',
      user: { id: 2 },
      organizations: [{ membership_uuid: 'm1', role: 'agent', is_primary: true, organization: { uuid: 'org-1', name: 'Brigade' } }],
    });
    http.get(`${API}/v2/matches`).subscribe();
    expect(backend.expectOne(`${API}/v2/matches`).request.headers.get('X-Organization')).toBe('org-1');
  });

  it('401 : session effacée, retour à la connexion en retenant la page', async () => {
    session.start({ token: 'abc', user: { id: 1 } });
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/espace/correspondances');

    let failed = false;
    http.get(`${API}/v2/matches`).subscribe({ error: () => (failed = true) });
    backend.expectOne(`${API}/v2/matches`).flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(session.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/connexion'], { queryParams: { expired: 1 } });
    expect(TestBed.inject(RedirectService).getRedirectUrl()).toBe('/espace/correspondances');
  });

  it('401 sur un mauvais mot de passe : pas de redirection', () => {
    const navigate = vi.spyOn(router, 'navigate');
    http.post(`${API}/login`, {}).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/login`).flush({ message: 'Identifiants invalides' }, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('403 « pas rattaché » : structure active oubliée', () => {
    session.start({
      token: 'abc',
      user: { id: 2 },
      organizations: [{ membership_uuid: 'm1', role: 'agent', is_primary: false, organization: { uuid: 'org-1', name: 'Brigade' } }],
    });
    session.setActiveOrganization('org-1');

    http.get(`${API}/v2/matches`).subscribe({ error: () => undefined });
    backend
      .expectOne(`${API}/v2/matches`)
      .flush({ message: "Vous n'êtes pas rattaché à cette organisation." }, { status: 403, statusText: 'Forbidden' });

    expect(localStorage.getItem('active_organization')).toBeNull();
  });
});
