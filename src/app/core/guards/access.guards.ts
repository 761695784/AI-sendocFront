import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { map } from 'rxjs';
import { SessionStore } from '../session/session.store';
import { RedirectService } from '../../components/services/redirection.service';

/** Vers la connexion, en retenant la page demandée. */
function toLogin(url: string): UrlTree {
  inject(RedirectService).setRedirectUrl(url);
  return inject(Router).createUrlTree(['/connexion']);
}

/** Utilisateur connecté (n'importe quel profil). */
export const authGuard: CanActivateFn = (_route, state) => {
  return inject(SessionStore).isAuthenticated() ? true : toLogin(state.url);
};

/** Super administrateur de la plateforme. */
export const superAdminGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  if (!session.isAuthenticated()) {
    return toLogin(state.url);
  }
  return session.isSuperAdmin() ? true : inject(Router).createUrlTree([session.homeUrl()]);
};

/**
 * Personnel des structures (agent, responsable, administrateur d'institution) ou super admin.
 * Charge au passage les droits détaillés si la session vient de /login (qui ne les donne pas).
 */
export const staffGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  if (!session.isAuthenticated()) {
    return toLogin(state.url);
  }
  const decide = () => (session.isStaff() || session.isSuperAdmin() ? true : router.createUrlTree([session.homeUrl()]));

  return session.needsMembershipDetails() ? session.loadMemberships().pipe(map(decide)) : decide();
};

/**
 * Droit précis de l'affectation active, ex. `abilityGuard('matches.review')`.
 * Plusieurs droits = l'un d'eux suffit. À placer sous staffGuard.
 */
export function abilityGuard(...abilities: string[]): CanActivateFn {
  return () => {
    const session = inject(SessionStore);
    return session.canAny(abilities) ? true : inject(Router).createUrlTree(['/espace']);
  };
}

/** Pour les routes à contenu différent selon le profil (canMatch). */
export const isCitizenMatch: CanMatchFn = () => inject(SessionStore).isCitizen();
