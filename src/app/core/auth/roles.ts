/**
 * Rôles renvoyés par l'API DocTrack.
 *
 * Depuis la V2, les rôles globaux s'appellent `super_admin` et `citizen`
 * (anciennement `Admin` et `SimpleUser`). L'API renvoie :
 *  - `response.roles`        : liste de textes, anciens noms inclus (`['super_admin', 'Admin']`) ;
 *  - `response.user.roles`   : objets Spatie `{ name: 'super_admin', ... }` ;
 *  - `response.organizations`: affectations aux structures (agents, responsables).
 * Ces fonctions acceptent les deux formes pour rester compatibles.
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

/** Enregistre la session après connexion (jeton, utilisateur, rôles, structures). */
export function storeSession(response: any): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  const token = response?.token ?? response?.access_token;
  if (!token || !response?.user) {
    return;
  }
  const storage = window.localStorage;
  storage.setItem('token', token);
  storage.setItem('user', JSON.stringify(response.user));
  storage.setItem('userId', String(response.user.id));
  storage.setItem('roles', JSON.stringify(roleNames(response.roles, response.user.roles)));
  storage.setItem('organizations', JSON.stringify(response.organizations ?? []));
}

/** Rôles de la session enregistrée. */
export function storedRoles(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const user = JSON.parse(window.localStorage.getItem('user') || '{}');
    const roles = JSON.parse(window.localStorage.getItem('roles') || '[]');
    return roleNames(roles, user?.roles);
  } catch {
    return [];
  }
}
