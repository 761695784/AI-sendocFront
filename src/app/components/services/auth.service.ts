import { I18nService } from '../../core/i18n/i18n.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';
import { User } from '../register/register.component';
import { apiUrl } from './apiUrl';
import { SessionStore } from '../../core/session/session.store';
import { LoginResponse } from '../../core/session/session.models';

/**
 * Authentification et comptes (API V1).
 * Le jeton est ajouté automatiquement par l'intercepteur (core/http/auth.interceptor.ts)
 * et la session est tenue par SessionStore.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  public readonly router = inject(Router);
  private readonly session = inject(SessionStore);

  // ── Session ──────────────────────────────────────────────────────

  /** Connexion. La navigation après connexion est faite par l'écran (session.homeUrl()). */
  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (response?.token) {
          this.session.start(response);
        }
      }),
    );
  }

  /** Vérification du code reçu par e-mail : connecte aussi l'utilisateur. */
  verifyEmailCode(email: string, code: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${apiUrl}/verify-email`, { email, code }).pipe(
      tap((response) => this.session.start(response)),
    );
  }

  isAuthenticated(): boolean {
    return this.session.isAuthenticated();
  }

  getUserName(): string {
    return (this.session.user()?.FirstName as string | undefined) || this.i18n.t('auth.utilisateur');
  }

  logout(): void {
    // Invalide le jeton côté API (sans attendre la réponse), puis efface la session.
    if (this.session.isAuthenticated()) {
      this.http.post(`${apiUrl}/logout`, {}).subscribe({ error: () => undefined });
    }
    this.session.clear();
    this.router.navigate(['/connexion']);
  }

  register(user: User): Observable<any> {
    return this.http.post(`${apiUrl}/register`, user);
  }

  sendResetPasswordEmail(email: string): Observable<any> {
    // POST : l'adresse email ne passe pas dans l'URL (journaux, historique) et la limite anti-abus s'applique.
    return this.http.post(`${apiUrl}/forgot-password`, { email });
  }

  resetPassword(data: { token: string; email: string; password: string; password_confirmation: string }): Observable<any> {
    return this.http.post(`${apiUrl}/reset-password`, data);
  }

  // ── Profil ───────────────────────────────────────────────────────

  getUserProfile(): Observable<any> {
    return this.http.get(`${apiUrl}/me`);
  }

  updateProfile(profileData: any): Observable<any> {
    return this.http.put(`${apiUrl}/profil`, profileData);
  }

  changePassword(passwordData: any): Observable<any> {
    return this.http.put(`${apiUrl}/change-password`, passwordData);
  }

  renewQrCode(): Observable<any> {
    if (!this.session.isAuthenticated()) {
      return throwError(() => new Error('Aucun token disponible'));
    }
    return this.http.post(`${apiUrl}/renew-qr-code`, {});
  }

  // ── Notifications (V1) ───────────────────────────────────────────

  getAllNotifications(): Observable<any> {
    return this.http.get(`${apiUrl}/notifications`);
  }

  markAllAsRead(): Observable<any> {
    return this.http.post(`${apiUrl}/notifications/mark-all-as-read`, null);
  }

  markNotificationAsRead(notificationId: number): Observable<any> {
    return this.http.patch(`${apiUrl}/notifications/${notificationId}/mark-as-read`, null);
  }

  // ── Administration (super admin) ─────────────────────────────────

  getAllUsers(): Observable<any> {
    return this.http.get(`${apiUrl}/users`);
  }

  /** Supprime (anonymise) un compte : l'API attend l'identifiant public (uuid). */
  deleteUser(uuid: string): Observable<any> {
    return this.http.delete(`${apiUrl}/users/${uuid}`);
  }

  addUser(userData: any): Observable<any> {
    return this.http.post(`${apiUrl}/create-admin`, userData);
  }

  getAllEmailLogs(): Observable<any> {
    return this.http.get(`${apiUrl}/all-emails`);
  }

  getAllData(): Observable<any> {
    return this.http.get(`${apiUrl}/all-notifications`);
  }

  getRestitutionRequestCount(): Observable<any> {
    return this.http.get(`${apiUrl}/restitution-count`);
  }

  getActivityLogs(page = 1, q = ''): Observable<any> {
    const params: Record<string, string | number> = { page };
    if (q) { params['q'] = q; }
    return this.withTimeout(this.http.get(`${apiUrl}/activity-logs`, { params }));
  }

  getActivityLogsByType(type: string, page = 1, q = ''): Observable<any> {
    const params: Record<string, string | number> = { page };
    if (q) { params['q'] = q; }
    return this.withTimeout(this.http.get(`${apiUrl}/activity-logs/${type}`, { params }));
  }

  /** 15 secondes max, sinon message clair. */
  private withTimeout<T>(request: Observable<T>): Observable<T> {
    return request.pipe(
      timeout(15000),
      catchError((err) =>
        throwError(() => (err?.name === 'TimeoutError' ? new Error('La requête a pris trop de temps.') : err)),
      ),
    );
  }
}
