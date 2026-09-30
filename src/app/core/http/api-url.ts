import { environment } from '../../../environments/environment';

/** Vrai si la requête part vers l'API DocTrack (et pas vers un service tiers). */
export function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiUrl) || url.startsWith('/api/');
}

/** Points d'entrée publics d'authentification : pas de jeton, pas de redirection sur 401. */
const AUTH_ENDPOINTS = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/refresh'];

export function isAuthEndpoint(url: string): boolean {
  const path = url.split('?')[0];
  return AUTH_ENDPOINTS.some((end) => path.endsWith(end));
}

/** Construit une adresse de l'API V2 : apiV2('declarations', uuid) → …/api/v2/declarations/<uuid>. */
export function apiV2(...segments: Array<string | number>): string {
  return [`${environment.apiUrl}/v2`, ...segments.map((s) => encodeURIComponent(String(s)))].join('/');
}

/** Construit une adresse de l'API V1 : apiV1('documents', uuid). */
export function apiV1(...segments: Array<string | number>): string {
  return [environment.apiUrl, ...segments.map((s) => encodeURIComponent(String(s)))].join('/');
}
