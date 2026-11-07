/**
 * Configuration de PRODUCTION (utilisée par `ng build`).
 */
export const environment = {
  production: true,
  /** Adresse de l'API Laravel (V1 : /api/..., V2 : /api/v2/...). */
  apiUrl: 'https://docapi.casaimpact.org/api',
  /** Adresse de base des images publiques (storage). */
  imageUrl: 'https://docapi.casaimpact.org',
  /** Adresse publique du site (adresses canoniques, partage, plan du site). À changer avec le nom de domaine. */
  siteUrl: 'https://sendoctrack-ai.netlify.app',
};
