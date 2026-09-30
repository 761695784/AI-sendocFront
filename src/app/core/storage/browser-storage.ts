/**
 * Accès sûr au localStorage : ne plante ni au rendu serveur (SSR, pas de `window`),
 * ni en navigation privée (accès refusé).
 */
function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const browserStorage = {
  get(key: string): string | null {
    try {
      return storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    try {
      storage()?.setItem(key, value);
    } catch {
      /* stockage indisponible : on continue sans persistance */
    }
  },

  remove(...keys: string[]): void {
    for (const key of keys) {
      try {
        storage()?.removeItem(key);
      } catch {
        /* rien */
      }
    }
  },

  getJson<T>(key: string, fallback: T): T {
    const raw = this.get(key);
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setJson(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  },
};

/** Clés utilisées (les anciennes clés sont conservées pour les écrans V1). */
export const STORAGE_KEYS = {
  token: 'token',
  user: 'user',
  userId: 'userId',
  roles: 'roles',
  organizations: 'organizations',
  activeOrganization: 'active_organization',
} as const;
