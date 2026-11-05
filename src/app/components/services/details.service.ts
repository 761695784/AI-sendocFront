import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentDetails } from '../document-detail/document-detail.component';
import { apiUrl } from './apiUrl';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { assetUrl } from './imageUrl';

@Injectable({
  providedIn: 'root'
})
export class DetailsService {

  constructor(private http: HttpClient) {}

  // Récupérer les détails d'une publication
  getDocumentDetails(uuid: string): Observable<DocumentDetails> {
    return this.http.get<DocumentDetails>(`${apiUrl}/documents/${uuid}`).pipe(
      map(details => {
        details.image = assetUrl(details.image);
        return details;
      }),
      catchError((error) => {
        return throwError(error);
      })
    );
  }

  // Envoyer une demande de restitution
  requestRestitution(uuid: string): Observable<any> {
    return this.http.post<any>(`${apiUrl}/documents/${uuid}/restitution`, {});
  }
}
