import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionStore } from '../session/session.store';
import { isApiRequest, isAuthEndpoint } from './api-url';

/**
 * Ajoute « Authorization: Bearer <jeton> » à chaque appel de l'API DocTrack.
 * Remplace les en-têtes ajoutés à la main dans chaque service.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(SessionStore).token();

  if (
    !token ||
    !isApiRequest(req.url) ||
    req.headers.has('Authorization') ||
    (isAuthEndpoint(req.url) && !req.url.endsWith('/refresh'))
  ) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
