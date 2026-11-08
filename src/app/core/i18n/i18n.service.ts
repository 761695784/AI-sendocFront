import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { FR, TKey } from './dictionaries/fr';

export type Lang = 'fr' | 'en' | 'pt';
export type Dictionary = Record<TKey, string>;

/** Langues proposées dans le sélecteur (ordre d'affichage). */
export const LANGUAGES: ReadonlyArray<{ code: Lang; short: string; label: string }> = [
  { code: 'fr', short: 'FR', label: 'Français' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'pt', short: 'PT', label: 'Português' },
];

const STORAGE_KEY = 'doctrack-lang';

/** Service actif, pour les fonctions utilitaires qui ne peuvent pas l'injecter (messages d'erreur communs). */
let active: I18nService | null = null;

/** Texte traduit depuis une fonction hors composant (le français si le service n'est pas encore créé). */
export function translate(key: TKey, params?: Record<string, string | number | null | undefined>): string {
  return active ? active.t(key, params) : (FR[key] as string);
}

/**
 * Traduction du site (français, anglais, portugais).
 *
 * - Le français est la langue de référence : il est inclus dans l'application et sert au rendu serveur (référencement).
 * - L'anglais et le portugais sont chargés à la demande (fichiers séparés), une seule fois.
 * - Choix du visiteur mémorisé dans le navigateur ; à la première visite, langue du téléphone si elle est proposée.
 * - Un texte absent d'une traduction s'affiche en français : jamais de clé brute à l'écran.
 *
 * Ajouter un texte : une clé dans dictionaries/fr.ts, puis la même clé dans en.ts et pt.ts
 * (la compilation signale toute traduction manquante).
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly loaded = new Map<Lang, Dictionary>([['fr', FR]]);
  private dict: Dictionary = FR;

  /** Langue affichée (signal : les vues se mettent à jour quand elle change). */
  readonly lang = signal<Lang>('fr');

  constructor() {
    active = this;
  }

  /** À appeler une fois au démarrage, côté navigateur. */
  init(): void {
    if (!this.browser) {
      return;
    }
    const wanted = this.saved() ?? this.fromBrowser();
    if (wanted !== 'fr') {
      void this.use(wanted);
    }
  }

  async use(lang: Lang): Promise<void> {
    try {
      const dict = this.loaded.get(lang) ?? (await this.load(lang));
      this.loaded.set(lang, dict);
      this.dict = dict;
      this.lang.set(lang);
      this.doc.documentElement.lang = lang;
      this.remember(lang);
    } catch {
      // Fichier de langue indisponible (hors connexion…) : on reste dans la langue actuelle.
    }
  }

  /** Texte traduit ; « {nom} » est remplacé par params.nom. */
  t(key: TKey, params?: Record<string, string | number | null | undefined>): string {
    this.lang(); // lu ici : les vues et calculs qui affichent ce texte se mettent à jour au changement de langue
    let text: string = this.dict[key] ?? FR[key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.split(`{${name}}`).join(String(value ?? ''));
      }
    }
    return text;
  }

  /**
   * Traduit un libellé français déjà écrit dans le code (listes de statuts, messages définis hors composant).
   * Le texte doit exister mot pour mot dans fr.ts ; sinon il est renvoyé tel quel.
   */
  fromFr(text: string | null | undefined): string {
    if (!text) {
      return text ?? '';
    }
    this.byFrench ??= new Map(Object.entries(FR).map(([k, v]) => [v as string, k as TKey]));
    const key = this.byFrench.get(text);
    return key ? this.t(key) : text;
  }

  private byFrench: Map<string, TKey> | null = null;

  private load(lang: Lang): Promise<Dictionary> {
    switch (lang) {
      case 'en':
        return import('./dictionaries/en').then((m) => m.EN);
      case 'pt':
        return import('./dictionaries/pt').then((m) => m.PT);
      default:
        return Promise.resolve(FR);
    }
  }

  private saved(): Lang | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return isLang(value) ? value : null;
    } catch {
      return null;
    }
  }

  private fromBrowser(): Lang {
    const code = (globalThis.navigator?.language ?? 'fr').slice(0, 2).toLowerCase();
    return isLang(code) ? code : 'fr';
  }

  private remember(lang: Lang): void {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* stockage indisponible (navigation privée) : le choix vaut pour la page ouverte */
    }
  }
}

export function isLang(value: unknown): value is Lang {
  return value === 'fr' || value === 'en' || value === 'pt';
}
