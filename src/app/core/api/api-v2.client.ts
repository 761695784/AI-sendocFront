import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiV2 } from '../http/api-url';
import { QueryParams } from './api.types';

/**
 * Accès de base à l'API V2 (`/api/v2/...`).
 * Le jeton et la structure active sont ajoutés par les intercepteurs.
 *
 *   this.api.get<Page<Declaration>>(['declarations'], { page: 2 })
 *   this.api.post<Match>(['matches', uuid, 'confirm'], { note })
 */
@Injectable({ providedIn: 'root' })
export class ApiV2Client {
  private readonly http = inject(HttpClient);

  get<T>(path: Array<string | number>, query?: QueryParams): Observable<T> {
    return this.http.get<T>(apiV2(...path), { params: toParams(query) });
  }

  post<T>(path: Array<string | number>, body: unknown = {}, query?: QueryParams): Observable<T> {
    return this.http.post<T>(apiV2(...path), body, { params: toParams(query) });
  }

  patch<T>(path: Array<string | number>, body: unknown = {}): Observable<T> {
    return this.http.patch<T>(apiV2(...path), body);
  }

  delete<T>(path: Array<string | number>): Observable<T> {
    return this.http.delete<T>(apiV2(...path));
  }

  /** Fichier (PDF, Excel, image) : renvoie un Blob. */
  blob(path: Array<string | number>, query?: QueryParams): Observable<Blob> {
    return this.http.get(apiV2(...path), { params: toParams(query), responseType: 'blob' });
  }
}

/** Retire les valeurs vides (null, undefined, '') pour ne pas envoyer « ?statut= ». */
export function toParams(query?: QueryParams): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/** Objet → FormData (fichiers, tableaux `items[0][champ]`, booléens 1/0) pour les envois multipart. */
export function toFormData(data: Record<string, unknown>, form = new FormData(), prefix = ''): FormData {
  for (const [key, value] of Object.entries(data)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value === null || value === undefined) {
      continue;
    }
    if (value instanceof Blob) {
      form.append(name, value);
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === 'object' && !(item instanceof Blob)) {
          toFormData(item as Record<string, unknown>, form, `${name}[${i}]`);
        } else if (item instanceof Blob) {
          form.append(`${name}[${i}]`, item);
        } else if (item !== null && item !== undefined) {
          form.append(`${name}[${i}]`, String(item));
        }
      });
    } else if (typeof value === 'object') {
      toFormData(value as Record<string, unknown>, form, name);
    } else if (typeof value === 'boolean') {
      form.append(name, value ? '1' : '0');
    } else {
      form.append(name, String(value));
    }
  }
  return form;
}

/** Télécharge un Blob sous un nom de fichier (navigateur uniquement). */
export function saveBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Message lisible d'une erreur HTTP de l'API (validation Laravel comprise). */
export function apiErrorMessage(error: any, fallback = 'Une erreur est survenue, veuillez réessayer.'): string {
  if (error?.status === 0) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  }
  const body = error?.error;
  if (error?.status === 429) {
    // Limitation des requêtes : message de l'API s'il est en français, sinon délai d'attente.
    if (typeof body?.message === 'string' && /tentatives|réessayez/i.test(body.message)) {
      return body.message;
    }
    const retry = Number(error?.headers?.get?.('Retry-After') ?? body?.retry_after ?? 60);
    return `Trop de tentatives. Réessayez dans ${retry >= 120 ? Math.ceil(retry / 60) + ' minutes' : retry + ' secondes'}.`;
  }
  if (body?.errors && typeof body.errors === 'object') {
    const first = Object.values(body.errors as Record<string, string[]>)[0];
    if (Array.isArray(first) && first[0]) {
      return first[0];
    }
  }
  return body?.message || error?.message || fallback;
}
