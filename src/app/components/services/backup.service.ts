import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from './apiUrl';

@Injectable({
  providedIn: 'root'
})
export class BackupService {

  constructor(private http: HttpClient) {}

  // ── Helper headers ──────────────────────────────
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Liste des backups ───────────────────────────
  listBackups(): Observable<any> {
    return this.http.get<any>(
      `${apiUrl}/backup/list`,
      { headers: this.getHeaders() }
    );
  }

  // ── Lancer un backup ────────────────────────────
  runBackup(): Observable<any> {
    return this.http.post<any>(
      `${apiUrl}/backup/run`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // ── Vérifier la santé ───────────────────────────
  checkStatus(): Observable<any> {
    return this.http.get<any>(
      `${apiUrl}/backup/status`,
      { headers: this.getHeaders() }
    );
  }

  // ── Nettoyer les backups ────────────────────────
  cleanBackups(): Observable<any> {
    return this.http.post<any>(
      `${apiUrl}/backup/clean`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // ── Télécharger un backup ───────────────────────
  downloadBackup(filename: string): Observable<Blob> {
    return this.http.get(
      `${apiUrl}/backup/download?file=${encodeURIComponent(filename)}`,
      { headers: this.getHeaders(), responseType: 'blob' }
    );
  }
}
