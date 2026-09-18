import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from './apiUrl'; // Assure-toi que apiUrl est défini

@Injectable({
  providedIn: 'root'
})
export class FoundQrService {
  private apiEndpoint = `${apiUrl}/found-qr`;

  constructor(private http: HttpClient) {}

  // Méthode pour l'envoie du numéro de téléphone du trouver au owner du document
  submitFinderPhone(token: string, finderPhone: string): Observable<any> {
    const data = { token, finder_phone: finderPhone };
    return this.http.post(this.apiEndpoint, data, );
  }
}
