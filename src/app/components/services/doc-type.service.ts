import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  // Récupérer les types de documents
  getDocumentTypes(): Observable<DocType[]> {
    return this.http.get<DocType[]>(`${apiUrl}/document-types`, {
    });
  }
}
