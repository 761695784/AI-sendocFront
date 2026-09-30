import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Mode de rendu de chaque page :
 *  - Prerender : HTML généré une fois au build (pages publiques fixes, idéal pour le référencement) ;
 *  - Server    : HTML généré à chaque visite (pages publiques dont le contenu change) ;
 *  - Client    : rendu dans le navigateur uniquement (espaces connectés : jeton, localStorage).
 */
export const serverRoutes: ServerRoute[] = [
  // Pages publiques fixes
  { path: 'apropos', renderMode: RenderMode.Prerender },
  { path: 'private-policy', renderMode: RenderMode.Prerender },
  { path: 'connexion', renderMode: RenderMode.Prerender },
  { path: 'inscription', renderMode: RenderMode.Prerender },
  { path: 'reset', renderMode: RenderMode.Prerender },

  // Pages publiques dont le contenu vient de l'API (dernières publications, liste, fiche)
  { path: '', renderMode: RenderMode.Server },
  { path: 'accueil', renderMode: RenderMode.Server },
  { path: 'liste', renderMode: RenderMode.Server },
  { path: 'document/:uuid', renderMode: RenderMode.Server },

  // Tout le reste (espaces connectés, carte, QR) : navigateur uniquement
  { path: '**', renderMode: RenderMode.Client },
];
