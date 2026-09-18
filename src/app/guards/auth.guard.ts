import { RedirectService } from './../components/services/redirection.service';
import { AuthService } from './../components/services/auth.service';
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router, private redirectService: RedirectService) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {

    if (this.authService.isAuthenticated()) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const roles = user.roles || [];
      const isAdmin = roles.some((role: any) => role.name === 'Admin');

      // Bloquer l'accès aux routes spécifiques si l'utilisateur n'est pas admin
      const adminRoutes = ['admindec', 'admindetails/:id', 'adminpub', 'admin', 'adminuser','adminadd'];
      const isRestrictedAdminRoute = adminRoutes.some(route => next.routeConfig?.path?.startsWith(route));

      if (isRestrictedAdminRoute && !isAdmin) {
        this.router.navigate(['/accueil']);
        return false;
      }

      return true;
    } else {
      this.redirectService.setRedirectUrl(state.url);
      this.router.navigate(['/connexion']);
      return false;
    }
  }


}
