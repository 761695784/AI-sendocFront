import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Document } from '../document-list/document-list.component';
import { apiUrl } from './apiUrl';
import { IMAGE_URL_BASE } from './imageUrl';
import { Location } from './location.model';

@Injectable({
  providedIn: 'root'
})
export class PublicationsService {

  private publicationsSubject = new BehaviorSubject<Document[]>([]);
  public publications$ = this.publicationsSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  // ====================== Méthodes protégées (avec token) ======================

  // Documents supprimés
  getDeletedDocuments(): Observable<Document[]> {
    return this.getWithAuth(`${apiUrl}/deleted-documents`);
  }

  // Documents récupérés
  getRecoveredDocuments(): Observable<Document[]> {
    return this.getWithAuth(`${apiUrl}/recovered-documents`);
  }

  // Documents non récupérés
  getNotRecoveredDocuments(): Observable<Document[]> {
    return this.getWithAuth(`${apiUrl}/not-recovered-documents`);
  }

  // Toutes les publications (pour admin) y compris supprimées
  getAllDocumentsIncludingDeleted(): Observable<Document[]> {
    return this.getWithAuth(`${apiUrl}/all-publications`);
  }

  // Documents dans la corbeille (trashed)
  getTrashedDocuments(): Observable<Document[]> {
    return this.getWithAuth<{ data: Document[] }>(`${apiUrl}/trashed`).pipe(
      map(response => Array.isArray(response.data) ? response.data : [])
    );
  }

  // Publications de l'utilisateur connecté
  getUserPublications(): Observable<Document[]> {
    return this.getWithAuth<Document[]>(`${apiUrl}/my-publications`).pipe(
      map(publications =>
        publications.map(pub => {
          pub.image = pub.image ? `${IMAGE_URL_BASE}${pub.image}` : '';
          return pub;
        })
      )
    );
  }

  // ====================== Méthodes pour statistiques / graphiques ======================

  // Publications par type (diagramme en barre)
  getPublicationsByType(): Observable<any> {
    return this.getWithAuth<any>(`${apiUrl}/publications-by-type`).pipe(
      map(response => {
        // Normalise la réponse : on veut toujours { data: [...] } ou directement le tableau
        const data = response?.data || response || [];
        console.log('Données normalisées pour publications-by-type:', data);
        return { data };   // on retourne toujours un objet { data }
      })
    );
  }

  // Nombre de publications par statut
  getDocumentStatusCount(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get<any>(`${apiUrl}/status-count`, { headers });
  }

  // Demandes de restitution (diagramme circulaire)
  getRestitutionData(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.get<any>(`${apiUrl}/restitution-data`, { headers });
  }

  // Activité emails
  getEmailActivity(): Observable<any> {
    return this.getWithAuth(`${apiUrl}/email-activity`);
  }

  // Courbe d'évolution
  getEvolutionData(): Observable<any> {
    return this.getWithAuth(`${apiUrl}/statistics`);
  }

  // Publications par lieu
  getPublicationsByLocation(): Observable<Location[]> {
    return this.http.get<Location[]>(`${apiUrl}/lieu`).pipe(
      catchError(error => {
        console.error("Erreur lors de la récupération des données par lieu :", error);
        return throwError(() => error);
      })
    );
  }

  // ====================== Méthodes CRUD ======================

  // Récupérer toutes les publications publiques (sans token)
  getAllPublications(): Observable<Document[]> {
    return this.http.get<any>(`${apiUrl}/document`).pipe(
      tap(response => console.log('Réponse complète du serveur pour getAllPublications:', response)),
      map(response => {
        const documents = Array.isArray(response)
          ? response
          : (response?.data && Array.isArray(response.data))
            ? response.data
            : [];

        console.log('Documents extraits (data):', documents);
        this.publicationsSubject.next(documents);
        return documents;
      }),
      catchError(err => {
        console.error('Erreur lors de la récupération des publications', err);
        return throwError(() => new Error('Failed to fetch documents'));
      })
    );
  }

  // Ajouter une publication
  addPublication(document: FormData): Observable<Document> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post<Document>(`${apiUrl}/documents`, document, { headers });
  }

  // Supprimer une publication
  deletePublication(uuid: string): Observable<void> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.delete<void>(`${apiUrl}/documents/${uuid}`, { headers });
  }

  // Restaurer un document
  restoreDocument(uuid: string): Observable<{ success: boolean; message: string }> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.post<{ success: boolean; message: string }>(
      `${apiUrl}/documents/restore/${uuid}`, {}, { headers }
    );
  }

  // Modifier le statut
  updatePublicationStatus(uuid: string, statut: string): Observable<{ success: boolean; message: string; document: Document }> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    return this.http.put<{ success: boolean; message: string; document: Document }>(
      `${apiUrl}/documents/${uuid}`, { statut }, { headers }
    ).pipe(
      tap(response => {
        const updatedDocuments = this.publicationsSubject.value.map(doc =>
          doc.uuid === uuid ? { ...doc, statut: response.document.statut } : doc
        );
        this.publicationsSubject.next(updatedDocuments);
      })
    );
  }

  // ====================== Méthode privée réutilisable ======================
  private getWithAuth<T = Document[]>(url: string): Observable<T> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    return this.http.get<any>(url, { headers }).pipe(
      map(response => {
        // Gestion pagination Laravel (response.data) ou tableau direct
        if (Array.isArray(response)) {
          return response as T;
        }
        if (response?.data && Array.isArray(response.data)) {
          return response.data as T;
        }
        return [] as T;   // fallback sécurisé
      }),
      tap(data => {
        if (Array.isArray(data)) {
          console.log(`Données extraites depuis ${url}:`, data.length, 'éléments');
        }
      }),
      catchError(err => {
        console.error(`Erreur sur ${url}`, err);
        return throwError(() => err);
      })
    );
  }

  // Gestion d'erreur globale (si tu veux l'utiliser ailleurs)
  private handleError(error: any): Observable<never> {
    console.error('Une erreur est survenue:', error);
    return throwError(() => new Error('Une erreur est survenue, veuillez réessayer plus tard.'));
  }
}
