import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { browserStorage, STORAGE_KEYS } from '../storage/browser-storage';
import { isSuperAdmin, roleNames } from '../auth/roles';
import { jwtExpiry } from '../auth/jwt';
import { LoginResponse, Membership, MeOrganizationsResponse, SessionUser } from './session.models';

/** Renouvellement du jeton quand il reste moins de 10 minutes. */
const REFRESH_BEFORE_MS = 10 * 60 * 1000;

/**
 * Session de l'utilisateur connecté : jeton, profil, rôles, structures, structure active.
 *
 * - Source unique de vérité pour tout l'écran (signals) ;
 * - persistée dans le localStorage avec les mêmes clés qu'avant (les écrans V1 continuent de marcher) ;
 * - renouvelle le jeton automatiquement avant son expiration.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _token = signal<string | null>(browserStorage.get(STORAGE_KEYS.token));
  private readonly _user = signal<SessionUser | null>(browserStorage.getJson<SessionUser | null>(STORAGE_KEYS.user, null));
  private readonly _roles = signal<string[]>(
    roleNames(browserStorage.getJson<string[]>(STORAGE_KEYS.roles, []), this._user()?.roles),
  );
  private readonly _memberships = signal<Membership[]>(browserStorage.getJson<Membership[]>(STORAGE_KEYS.organizations, []));
  private readonly _activeUuid = signal<string | null>(browserStorage.get(STORAGE_KEYS.activeOrganization));

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshing$: Observable<string | null> | null = null;

  // ── Lecture ──────────────────────────────────────────────────────
  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly memberships = this._memberships.asReadonly();

  readonly isAuthenticated = computed(() => !!this._token());
  readonly isSuperAdmin = computed(() => isSuperAdmin(this._roles()));
  /** Agent, responsable ou administrateur d'institution (au moins une affectation). */
  readonly isStaff = computed(() => this._memberships().length > 0);
  readonly isCitizen = computed(() => this.isAuthenticated() && !this.isSuperAdmin() && !this.isStaff());

  readonly displayName = computed(() => {
    const u = this._user();
    const name = [u?.FirstName, u?.LastName].filter(Boolean).join(' ');
    return name || u?.email || 'Utilisateur';
  });

  /** Affectation active : celle choisie, sinon la principale, sinon la première. */
  readonly activeMembership = computed<Membership | null>(() => {
    const list = this._memberships();
    if (!list.length) {
      return null;
    }
    const chosen = this._activeUuid();
    return (
      list.find((m) => m.organization.uuid === chosen) ??
      list.find((m) => m.is_primary) ??
      list[0]
    );
  });

  readonly activeOrganization = computed(() => this.activeMembership()?.organization ?? null);

  /** Droits de l'affectation active. */
  readonly abilities = computed(() => new Set(this.activeMembership()?.abilities ?? []));

  constructor() {
    this.scheduleRefresh();
  }

  /** Vrai si l'affectation active donne ce droit (le super admin a tous les droits). */
  can(ability: string): boolean {
    return this.isSuperAdmin() || this.abilities().has(ability);
  }

  /** Vrai si l'un des droits est accordé. */
  canAny(abilities: string[]): boolean {
    return abilities.some((a) => this.can(a));
  }

  // ── Connexion / déconnexion ──────────────────────────────────────

  /** Démarre la session à partir de la réponse de /login ou /verify-email. */
  start(response: LoginResponse): void {
    const token = response.token ?? response.access_token ?? null;
    if (!token || !response.user) {
      return;
    }
    const roles = roleNames(response.roles, response.user.roles);
    this.setToken(token);
    this._user.set(response.user);
    this._roles.set(roles);
    this._memberships.set(response.organizations ?? []);

    browserStorage.setJson(STORAGE_KEYS.user, response.user);
    browserStorage.set(STORAGE_KEYS.userId, String(response.user.id));
    browserStorage.setJson(STORAGE_KEYS.roles, roles);
    browserStorage.setJson(STORAGE_KEYS.organizations, response.organizations ?? []);

    // Structure active mémorisée d'une session précédente : gardée si toujours valable.
    const active = this._activeUuid();
    if (active && !(response.organizations ?? []).some((m) => m.organization.uuid === active)) {
      this.setActiveOrganization(null);
    }
  }

  /** Efface tout (déconnexion, jeton expiré). */
  clear(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this._token.set(null);
    this._user.set(null);
    this._roles.set([]);
    this._memberships.set([]);
    browserStorage.remove(
      STORAGE_KEYS.token,
      STORAGE_KEYS.user,
      STORAGE_KEYS.userId,
      STORAGE_KEYS.roles,
      STORAGE_KEYS.organizations,
    );
    // La structure active reste mémorisée : l'agent la retrouve à la prochaine connexion.
  }

  /** Page d'accueil selon le profil. */
  homeUrl(): string {
    if (this.isSuperAdmin()) {
      return '/admin';
    }
    if (this.isStaff()) {
      return '/espace';
    }
    return '/accueil';
  }

  // ── Structures ───────────────────────────────────────────────────

  /** Change la structure au nom de laquelle l'agent agit (en-tête X-Organization). */
  setActiveOrganization(uuid: string | null): void {
    this._activeUuid.set(uuid);
    if (uuid) {
      browserStorage.set(STORAGE_KEYS.activeOrganization, uuid);
    } else {
      browserStorage.remove(STORAGE_KEYS.activeOrganization);
    }
  }

  /** Recharge les affectations et leurs droits (GET /api/v2/me/organizations). */
  loadMemberships(): Observable<Membership[]> {
    if (!this.isAuthenticated()) {
      return of([]);
    }
    return this.http.get<MeOrganizationsResponse>(`${environment.apiUrl}/v2/me/organizations`).pipe(
      map((res) => res.memberships ?? []),
      tap((list) => {
        this._memberships.set(list);
        browserStorage.setJson(STORAGE_KEYS.organizations, list);
        const active = this._activeUuid();
        if (active && !list.some((m) => m.organization.uuid === active)) {
          this.setActiveOrganization(null);
        }
      }),
      catchError(() => of(this._memberships())),
    );
  }

  /** Vrai si les droits détaillés n'ont pas encore été chargés (réponse de /login). */
  needsMembershipDetails(): boolean {
    return this._memberships().some((m) => !m.abilities);
  }

  // ── Jeton ────────────────────────────────────────────────────────

  private setToken(token: string): void {
    this._token.set(token);
    browserStorage.set(STORAGE_KEYS.token, token);
    this.scheduleRefresh();
  }

  /**
   * Renouvelle le jeton (POST /api/refresh). L'API n'accepte qu'un jeton encore valide :
   * on le fait donc AVANT l'expiration. Un seul appel à la fois.
   */
  refreshToken(): Observable<string | null> {
    if (!this._token()) {
      return of(null);
    }
    if (!this.refreshing$) {
      this.refreshing$ = this.http.post<{ token?: string }>(`${environment.apiUrl}/refresh`, {}).pipe(
        map((res) => res.token ?? null),
        tap((token) => token && this.setToken(token)),
        catchError(() => of(null)),
        finalize(() => (this.refreshing$ = null)),
        shareReplay(1),
      );
    }
    return this.refreshing$;
  }

  private scheduleRefresh(): void {
    if (!this.isBrowser) {
      return;
    }
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    const exp = jwtExpiry(this._token());
    if (!exp) {
      return;
    }
    const delay = exp.getTime() - Date.now() - REFRESH_BEFORE_MS;
    if (exp.getTime() <= Date.now()) {
      return; // déjà expiré : la prochaine requête recevra 401 → retour à la connexion
    }
    // Minuterie hors zone.js inutile ici : un seul déclenchement par heure environ.
    this.refreshTimer = setTimeout(() => this.refreshToken().subscribe(), Math.max(delay, 0));
  }
}
