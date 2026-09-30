/**
 * Rôles renvoyés par l'API DocTrack.
 *
 * Depuis la V2, les rôles globaux s'appellent `super_admin` et `citizen`
 * (anciennement `Admin` et `SimpleUser`). L'API renvoie :
 *  - `response.roles`        : liste de textes, anciens noms inclus (`['super_admin', 'Admin']`) ;
 *  - `response.user.roles`   : objets Spatie `{ name: 'super_admin', ... }` ;
 *  - `response.organizations`: affectations aux structures (agents, responsables).
 * Ces fonctions acceptent les deux formes.
 */

export const SUPER_ADMIN_ROLES = ['super_admin', 'Admin'];

type RoleLike = string | { name?: string } | null | undefined;

/** Noms des rôles, quelle que soit la forme reçue. */
export function roleNames(...sources: (RoleLike[] | null | undefined)[]): string[] {
  const names = new Set<string>();
  for (const list of sources) {
    for (const role of list ?? []) {
      const name = typeof role === 'string' ? role : role?.name;
      if (name) {
        names.add(name);
      }
    }
  }
  return [...names];
}

/** Vrai si l'un des rôles est celui du super administrateur. */
export function isSuperAdmin(...sources: (RoleLike[] | null | undefined)[]): boolean {
  return roleNames(...sources).some((name) => SUPER_ADMIN_ROLES.includes(name));
}
