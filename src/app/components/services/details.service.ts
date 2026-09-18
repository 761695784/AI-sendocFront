import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentDetails } from '../document-detail/document-detail.component';
import { apiUrl } from './apiUrl';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { IMAGE_URL_BASE } from './imageUrl';

@Injectable({
  providedIn: 'root'
})
export class DetailsService {

  constructor(private http: HttpClient) {}

  // Récupérer les détails d'une publication
  getDocumentDetails(uuid: string): Observable<DocumentDetails> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<DocumentDetails>(`${apiUrl}/documents/${uuid}`, { headers }).pipe(
      map(details => {
        details.image = details.image ? `${IMAGE_URL_BASE}${details.image}` : '';
        return details;
      }),
      catchError((error) => {
        return throwError(error);
      })
    );
  }

  // Envoyer une demande de restitution
  requestRestitution(uuid: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({'Authorization': `Bearer ${token}`});
    return this.http.post<any>(`${apiUrl}/documents/${uuid}/restitution`, {}, { headers });
  }
}
