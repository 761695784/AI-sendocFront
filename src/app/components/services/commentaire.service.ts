import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    return this.http.get<Commentaire[]>(`${apiUrl}/documents/${uuid}/comments`);
  }

  // Ajouter un commentaire 
  addCommentaire(commentaire: { contenu: string; document_id: number }): Observable<any> {
    return this.http.post<any>(`${apiUrl}/comments`, commentaire);
  }
}