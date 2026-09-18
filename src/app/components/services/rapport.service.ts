import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { apiUrl } from './apiUrl'; // ← même import que PublicationsService

export interface Rapport {
  uuid: string;
  periode_label: string;
  annee: number;
  mois: number | null;
  type: 'Mensuel' | 'Annuel';
  pdf_url: string | null;
  pdf_existe: boolean;
  genere_par: string | null;
  genere_le: string;
  niveau?: { icone: string; label: string; niveau: string } | null;
}

export interface RapportGenereResponse {
  success: boolean;
  message: string;
  rapport: Rapport;
}

export interface RapportsListResponse {
  success: boolean;
  rapports: Rapport[];
}

export interface RapportStatsResponse {
  success: boolean;
  data: {
    stats: any;
    analyse: any;
    meta: any;
  };
}

@Injectable({
  providedIn: 'root',
})
export class RapportService {
  constructor(private http: HttpClient) {}

  // ── Headers JWT ────────────────────────────────────────────
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // =========================================================
  // Récupérer la liste de tous les rapports sauvegardés
  // GET /api/rapports
  // =========================================================
  getAllRapports(): Observable<Rapport[]> {
    return this.http
      .get<RapportsListResponse>(`${apiUrl}/rapports`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => response.rapports ?? []),
        catchError(this.handleError),
      );
  }

  // =========================================================
  // Générer et sauvegarder un rapport
  // POST /api/rapports/generer
  // Body: { annee: number, mois?: number }
  // =========================================================
  genererRapport(
    annee: number,
    mois?: number,
  ): Observable<RapportGenereResponse> {
    const body: { annee: number; mois?: number } = { annee };
    if (mois) body.mois = mois;

    return this.http
      .post<RapportGenereResponse>(`${apiUrl}/rapports/generer`, body, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  // =========================================================
  // Récupérer les données JSON (stats + analyse) sans PDF
  // GET /api/rapports/stats?annee=2026&mois=3
  // =========================================================
  getStatsRapport(
    annee: number,
    mois?: number,
  ): Observable<RapportStatsResponse> {
    let url = `${apiUrl}/rapports/stats?annee=${annee}`;
    if (mois) url += `&mois=${mois}`;

    return this.http
      .get<RapportStatsResponse>(url, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // =========================================================
  // Voir un rapport en PDF (retourne un Blob)
  // GET /api/rapports/{uuid}/voir
  // =========================================================
  voirRapport(uuid: string): Observable<Blob> {
    return this.http
      .get(`${apiUrl}/rapports/${uuid}/voir`, {
        headers: this.getHeaders(),
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  // =========================================================
  // Télécharger un rapport en PDF (retourne un Blob)
  // GET /api/rapports/{uuid}/telecharger
  // =========================================================
  telechargerRapport(uuid: string): Observable<Blob> {
    return this.http
      .get(`${apiUrl}/rapports/${uuid}/telecharger`, {
        headers: this.getHeaders(),
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  // =========================================================
  // Supprimer un rapport
  // DELETE /api/rapports/{uuid}
  // =========================================================
  supprimerRapport(
    uuid: string,
  ): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{
        success: boolean;
        message: string;
      }>(`${apiUrl}/rapports/${uuid}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // =========================================================
  // Aperçu PDF live — construit l'URL avec token
  // GET /api/rapports/apercu?annee=2026&mois=3
  // Retourne l'URL à ouvrir dans window.open()
  // =========================================================
  buildApercuUrl(annee: number, mois?: number): string {
    const token = localStorage.getItem('token') ?? '';
    let url = `${apiUrl}/rapports/apercu?annee=${annee}`;
    if (mois) url += `&mois=${mois}`;
    url += `&token=${token}`;
    return url;
  }

  // ── Gestion des erreurs ───────────────────────────────────
  private handleError(error: any): Observable<never> {
    console.error('RapportService — erreur:', error);
    return throwError(
      () =>
        new Error(
          error?.error?.message ??
            'Une erreur est survenue, veuillez réessayer.',
        ),
    );
  }
}
