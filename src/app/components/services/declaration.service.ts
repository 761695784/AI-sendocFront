import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { apiUrl } from './apiUrl';

@Injectable({
  providedIn: 'root',
})
export class DeclarationService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  // Récupérer les déclarations de l'utilisateur connecté
  getUserDeclarations(): Observable<any[]> {
    return this.http.get<any[]>(`${apiUrl}/my-declarations`);
  }

  // Ajouter une déclaration
  addDeclaration(declaration: FormData): Observable<any> {
    return this.http
      .post<any>(`${apiUrl}/declarations`, declaration)
      .pipe(
        tap((response) => {
          // console.log('Réponse du serveur:', response);
        }),
      );
  }

  // Afficher toutes les déclarations pour l'admin
  // (en cours et supprimées : l'écran les sépare ; par défaut il n'affiche que celles en cours)
  getAllDeclarations(): Observable<any[]> {
    return this.http.get<any>(`${apiUrl}/declarations`, { params: { trashed: 'with', per_page: 100 } }).pipe(
      map((response) => response?.data ?? []), // ← simple, plus de data.data
    );
  }

  // Supprimer une déclaration
  deleteDeclaration(uuid: string): Observable<any> {
    return this.http.delete(`${apiUrl}/declarations/${uuid}`);
  }

  // Récupérer les déclarations supprimées
  getTrashedDeclarations(): Observable<{ success: boolean; message: string; data: any[];}> {
    return this.http.get<{ success: boolean; message: string; data: any[] }>(
      `${apiUrl}/trashed-declarations`,
    );
  }

  // Restaurer une déclaration supprimée
  restoreDeclaration(id: number): Observable<any> {
    return this.http.post(
      `${apiUrl}/declarations/restore/${id}`,
      {},
    );
  }

  // ── Certificats ─────────────────────────────────

  /**
   * Tous les certificats — Admin uniquement
   * Retourne le tableau depuis res.certificats
   */
  getCertificates(): Observable<any[]> {
    return this.http
      .get<any>(`${apiUrl}/admin/certificats`)
      .pipe(map((res) => res.certificats ?? res ?? []));
  }

  /**
   * Mes certificats — Utilisateur connecté
   */
  getMesCertificats(): Observable<any[]> {
    return this.http
      .get<any>(`${apiUrl}/my-certificats`)
      .pipe(map((res) => res.certificats ?? res ?? []));
  }

  /**
   * Voir un certificat en PDF (ouvre dans le navigateur)
   * Utilise window.open pour un affichage direct
   */
  viewCertificate(uuid: string): void {
    // On ouvre directement — le token est vérifié côté backend
    // via l'URL ou on peut passer par un blob si l'API l'exige
    this.http
      .get(`${apiUrl}/certificats/${uuid}/voir`, {
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          // Libère la mémoire après 60s
          setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        },
        error: (err) => console.error('Erreur ouverture certificat:', err),
      });
  }

  /**
   * Voir un certificat — retourne Observable<Blob>
   * Pour les cas où on gère le blob manuellement
   */
  viewCertificateBlob(uuid: string): Observable<Blob> {
    return this.http.get(`${apiUrl}/certificats/${uuid}/voir`, {
      responseType: 'blob',
    });
  }

  /**
   * Télécharger un certificat PDF
   */
  downloadCertificate(uuid: string): Observable<Blob> {
    return this.http.get(`${apiUrl}/certificats/${uuid}/telecharger`, {
      responseType: 'blob',
    });
  }

  /**
   * Helper : déclenche le téléchargement du PDF directement
   */
  triggerDownload(uuid: string, filename?: string): void {
    this.downloadCertificate(uuid).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename ?? `certificat_${uuid}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Erreur téléchargement:', err),
    });
  }
}
