import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Commentaire } from '../document-detail/document-detail.component';
import { apiUrl } from './apiUrl';

@Injectable({
  providedIn: 'root'
})
export class CommentairesService {

  constructor(private http: HttpClient) {}

  // Récupérer les commentaires par document 
  getCommentairesByDocument(uuid: string): Observable<Commentaire[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({'Authorization': `Bearer ${token}`});
    return this.http.get<Commentaire[]>(`${apiUrl}/documents/${uuid}/comments`, { headers });
  }

  // Ajouter un commentaire 
  addCommentaire(commentaire: { contenu: string; document_id: number }): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({'Authorization': `Bearer ${token}`});
    return this.http.post<any>(`${apiUrl}/comments`, commentaire, { headers });
  }
}