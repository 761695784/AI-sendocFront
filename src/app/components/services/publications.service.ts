import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Document } from '../document-list/document-list.component';
import { apiUrl } from './apiUrl';
import { assetUrl } from './imageUrl';
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
    return this.getWithAuth<any>(`${apiUrl}/trashed`).pipe(
      // Liste simple ; ancien format (page Laravel imbriquée dans « data ») accepté aussi.
      map((response: any) => Array.isArray(response?.data) ? response.data
        : Array.isArray(response?.data?.data) ? response.data.data
        : Array.isArray(response) ? response : [])
    );
  }

  // Publications de l'utilisateur connecté
  getUserPublications(): Observable<Document[]> {
    return this.getWithAuth<Document[]>(`${apiUrl}/my-publications`).pipe(
      map(publications =>
        publications.map(pub => {
          pub.image = assetUrl(pub.image);
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
    return this.http.get<any>(`${apiUrl}/status-count`);
  }

  // Demandes de restitution (diagramme circulaire)
  getRestitutionData(): Observable<any> {
    return this.http.get<any>(`${apiUrl}/restitution-data`);
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
    // Liste publique (100 dernières publications ; la pagination se fait à l'écran).
    return this.http.get<any>(`${apiUrl}/documents`, { params: { per_page: 100 } }).pipe(
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
    return this.http.post<Document>(`${apiUrl}/documents`, document);
  }

  // Supprimer une publication
  deletePublication(uuid: string): Observable<void> {
    return this.http.delete<void>(`${apiUrl}/documents/${uuid}`);
  }

  // Restaurer un document
  restoreDocument(uuid: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${apiUrl}/documents/restore/${uuid}`, {}
    );
  }

  // Modifier le statut
  updatePublicationStatus(uuid: string, statut: string): Observable<{ success: boolean; message: string; document: Document }> {
    return this.http.put<{ success: boolean; message: string; document: Document }>(
      `${apiUrl}/documents/${uuid}`, { statut }
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

    return this.http.get<any>(url).pipe(
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
