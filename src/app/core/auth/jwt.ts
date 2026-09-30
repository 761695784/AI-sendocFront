/**
 * Lecture (sans vérification de signature) de la date d'expiration d'un jeton JWT.
 * La vérification reste faite par l'API ; ici on sait seulement quand le renouveler.
 */
export function jwtExpiry(token: string | null | undefined): Date | null {
  if (!token) {
    return null;
  }
  const part = token.split('.')[1];
  if (!part) {
    return null;
  }
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded); // disponible dans les navigateurs et dans Node (rendu serveur)
    const payload = JSON.parse(json);
    return typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}

/** Vrai si le jeton est expiré (ou illisible) à la date donnée, avec une marge en secondes. */
export function isJwtExpired(token: string | null | undefined, now = new Date(), marginSeconds = 0): boolean {
  const exp = jwtExpiry(token);
  if (!exp) {
    return !token;
  }
  return exp.getTime() - marginSeconds * 1000 <= now.getTime();
}
