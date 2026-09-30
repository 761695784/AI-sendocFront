import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionStore } from '../session/session.store';
import { isApiRequest } from './api-url';

/**
 * Indique à l'API la structure au nom de laquelle l'agent agit (en-tête X-Organization).
 * Uniquement pour les agents rattachés à au moins une structure ; sans effet pour les citoyens.
 */
export const organizationInterceptor: HttpInterceptorFn = (req, next) => {
  const organization = inject(SessionStore).activeOrganization();

  if (!organization || !isApiRequest(req.url) || req.headers.has('X-Organization')) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { 'X-Organization': organization.uuid } }));
};
