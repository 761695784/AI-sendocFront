import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { SessionStore } from '../core/session/session.store';
import { RedirectService } from '../components/services/redirection.service';

/**
 * @deprecated Utiliser les gardes de `core/guards/access.guards.ts`
 * (authGuard, superAdminGuard, staffGuard, abilityGuard). Conservée pour compatibilité.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly redirectService = inject(RedirectService);

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (!this.session.isAuthenticated()) {
      this.redirectService.setRedirectUrl(state.url);
      return this.router.createUrlTree(['/connexion']);
    }
    const adminRoutes = ['admindec', 'admindetails', 'adminpub', 'admin', 'adminuser', 'adminadd'];
    const isAdminRoute = adminRoutes.some((route) => next.routeConfig?.path?.startsWith(route));
    return isAdminRoute && !this.session.isSuperAdmin() ? this.router.createUrlTree(['/accueil']) : true;
  }
}
