import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionStore } from '../session/session.store';
import { RedirectService } from '../../components/services/redirection.service';
import { isApiRequest, isAuthEndpoint } from './api-url';

/**
 * Réactions communes aux erreurs de l'API :
 *  - 401 (jeton absent, expiré ou révoqué) → session effacée, retour à la connexion,
 *    puis retour à la page demandée après connexion ;
 *  - 403 « pas rattaché à cette organisation » → structure active oubliée (l'agent a changé d'affectation).
 * L'erreur est toujours transmise à l'écran, qui affiche son propre message.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const redirect = inject(RedirectService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && isApiRequest(req.url)) {
        if (error.status === 401 && !isAuthEndpoint(req.url) && session.isAuthenticated()) {
          session.clear();
          const current = router.url;
          if (!current.startsWith('/connexion')) {
            redirect.setRedirectUrl(current);
            router.navigate(['/connexion'], { queryParams: { expired: 1 } });
          }
        }

        if (error.status === 403 && req.headers.has('X-Organization') && /rattach/i.test(error.error?.message ?? '')) {
          session.setActiveOrganization(null);
        }
      }
      return throwError(() => error);
    }),
  );
};
