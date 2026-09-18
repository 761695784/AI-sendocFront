import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from './apiUrl';

export interface DocType {
  id: number;
  TypeName: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocTypeService {
  constructor(private http: HttpClient) {}

  // ── Helper headers ──────────────────────────────
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // Récupérer les types de documents
  getDocumentTypes(): Observable<DocType[]> {
    return this.http.get<DocType[]>(`${apiUrl}/document-types`, {
      headers: this.getHeaders(),
    });
  }
}
