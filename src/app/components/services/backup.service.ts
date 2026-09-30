import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from './apiUrl';

@Injectable({
  providedIn: 'root'
})
export class BackupService {

  constructor(private http: HttpClient) {}

  // ── Liste des backups ───────────────────────────
  listBackups(): Observable<any> {
    return this.http.get<any>(
      `${apiUrl}/backup/list`
    );
  }

  // ── Lancer un backup ────────────────────────────
  runBackup(): Observable<any> {
    return this.http.post<any>(
      `${apiUrl}/backup/run`,
      {}
    );
  }

  // ── Vérifier la santé ───────────────────────────
  checkStatus(): Observable<any> {
    return this.http.get<any>(
      `${apiUrl}/backup/status`
    );
  }

  // ── Nettoyer les backups ────────────────────────
  cleanBackups(): Observable<any> {
    return this.http.post<any>(
      `${apiUrl}/backup/clean`,
      {}
    );
  }

  // ── Télécharger un backup ───────────────────────
  downloadBackup(filename: string): Observable<Blob> {
    return this.http.get(
      `${apiUrl}/backup/download?file=${encodeURIComponent(filename)}`,
      { responseType: 'blob' }
    );
  }
}
