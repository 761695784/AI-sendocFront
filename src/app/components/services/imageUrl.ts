import { environment } from '../../../environments/environment';

/** Adresse de base des images : voir src/environments/ (production / développement). */
export const IMAGE_URL_BASE = environment.imageUrl;

/**
 * Adresse complète d'une image renvoyée par l'API.
 * L'API renvoie désormais des liens complets (souvent signés et temporaires, ex. QR code, photo d'origine) :
 * on ne les préfixe pas. Seuls les anciens chemins relatifs (« storage/… ») reçoivent l'adresse de base.
 */
export function assetUrl(path: string | null | undefined): string {
  if (!path) {
    return '';
  }
  if (/^(https?:|data:|blob:)/i.test(path) || path.startsWith('//')) {
    return path;
  }
  return `${IMAGE_URL_BASE.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
