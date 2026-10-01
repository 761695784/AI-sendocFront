import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Espace dans lequel l'écran est affiché : `/admin` (super admin) ou `/espace` (structures).
 * Les écrans de pilotage sont partagés par les deux espaces : leurs liens internes
 * (retour à la liste, fiche…) restent ainsi dans l'espace courant.
 * À appeler dans un contexte d'injection (initialisation d'un champ de composant).
 * On lit la route activée (et non router.url, qui vaut encore l'ancienne adresse pendant la navigation).
 */
export function spaceBase(): '/admin' | '/espace' {
  const route = inject(ActivatedRoute, { optional: true });
  const top = route?.snapshot?.pathFromRoot.find((r) => r.routeConfig?.path);
  return top?.routeConfig?.path === 'admin' ? '/admin' : '/espace';
}
