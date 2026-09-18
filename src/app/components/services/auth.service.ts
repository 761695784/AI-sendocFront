import { RedirectService } from './redirection.service';
import { User } from '../register/register.component';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { tap,timeout, catchError } from 'rxjs/operators';
import { apiUrl } from './apiUrl';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private http: HttpClient,
    public router: Router,
    private redirectService: RedirectService,
  ) {}

  // ── Helper sécurisé pour localStorage ──
  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  private getToken(): string {
    return this.getStorage()?.getItem('token') || '';
  }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.getToken()}` });
  }

  // Récupérer le profil utilisateur
  getUserProfile(): Observable<any> {
    return this.http.get(`${apiUrl}/me`, { headers: this.getAuthHeaders() });
  }

  // Récupérer toutes les notifications
  getAllNotifications(): Observable<any> {
    return this.http.get(`${apiUrl}/notifications`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead(): Observable<any> {
    return this.http.post(`${apiUrl}/notifications/mark-all-as-read`, null, {
      headers: this.getAuthHeaders(),
    });
  }

  // Renouveler le QR code
  renewQrCode(): Observable<any> {
    if (!this.getToken()) {
      console.error('Aucun token trouvé dans localStorage');
      return throwError(() => new Error('Aucun token disponible'));
    }
    return this.http.post(
      `${apiUrl}/renew-qr-code`,
      {},
      { headers: this.getAuthHeaders() },
    );
  }

  // Marquer une notification comme lue
  markNotificationAsRead(notificationId: number): Observable<any> {
    return this.http.patch(
      `${apiUrl}/notifications/${notificationId}/mark-as-read`,
      null,
      { headers: this.getAuthHeaders() },
    );
  }

  // Inscription d'un utilisateur
  register(user: User): Observable<any> {
    return this.http.post(`${apiUrl}/register`, user);
  }

  // Connexion d'un utilisateur
  login(credentials: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${apiUrl}/login`, credentials, { headers }).pipe(
      tap((response: any) => {
        if (response.token) {
          const storage = this.getStorage();
          if (storage) {
            storage.setItem('token', response.token);
            storage.setItem('user', JSON.stringify(response.user));
            storage.setItem('userId', response.user.id);
          }
          const roles = response.user.roles || [];
          const isAdmin = roles.some((role: any) => role.name === 'Admin');
          if (isAdmin) {
            this.router.navigate(['/admin']);
          } else {
            const redirectUrl = this.redirectService.getRedirectUrl();
            this.redirectService.clearRedirectUrl();
            this.router.navigate([redirectUrl || '/accueil']);
          }
        }
      }),
    );
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Vérification du code email
  verifyEmailCode(email: string, code: string): Observable<any> {
    return this.http.post(`${apiUrl}/verify-email`, { email, code });
  }

  // Récupérer le prénom de l'utilisateur
  getUserName(): string {
    try {
      const raw = this.getStorage()?.getItem('user');
      if (!raw) return 'Utilisateur';
      const user = JSON.parse(raw);
      return user?.FirstName || 'Utilisateur';
    } catch {
      return 'Utilisateur';
    }
  }

  // Déconnexion
  logout(): void {
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem('token');
      storage.removeItem('user');
      storage.removeItem('userId');
    }
    this.router.navigate(['/connexion']);
  }

  // Modifier le profil
  updateProfile(profileData: any): Observable<any> {
    return this.http.put(`${apiUrl}/profil`, profileData, {
      headers: this.getAuthHeaders(),
    });
  }

  // Changer le mot de passe
  changePassword(passwordData: any): Observable<any> {
    return this.http.put(`${apiUrl}/change-password`, passwordData, {
      headers: this.getAuthHeaders(),
    });
  }

  // Récupérer tous les utilisateurs
  getAllUsers(): Observable<any> {
    return this.http.get(`${apiUrl}/users`, { headers: this.getAuthHeaders() });
  }

  // Supprimer un utilisateur
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${apiUrl}/users/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Ajouter un administrateur
  addUser(userData: any): Observable<any> {
    return this.http.post(`${apiUrl}/create-admin`, userData, {
      headers: this.getAuthHeaders(),
    });
  }

  // Récupérer tous les logs d'emails
  getAllEmailLogs(): Observable<any> {
    return this.http.get(`${apiUrl}/all-emails`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Récupérer toutes les données
  getAllData(): Observable<any> {
    return this.http.get(`${apiUrl}/all-notifications`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Récupérer le nombre de demandes de restitution
  getRestitutionRequestCount(): Observable<any> {
    return this.http.get(`${apiUrl}/restitution-count`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Envoyer un email de réinitialisation
  sendResetPasswordEmail(email: string): Observable<any> {
    return this.http.get(`${apiUrl}/forgot-password`, { params: { email } });
  }

  // Réinitialiser le mot de passe
  resetPassword(data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Observable<any> {
    return this.http.post(`${apiUrl}/reset-password`, data);
  }

getActivityLogs(page = 1): Observable<any> {
    return this.http.get(`${apiUrl}/activity-logs?page=${page}`, {
        headers: this.getAuthHeaders(),
    }).pipe(
        timeout(15000), // ← 15 secondes max, sinon erreur
        catchError(err => {
            if (err.name === 'TimeoutError') {
                return throwError(() => new Error('La requête a pris trop de temps.'));
            }
            return throwError(() => err);
        })
    );
}

getActivityLogsByType(type: string, page = 1): Observable<any> {
    return this.http.get(`${apiUrl}/activity-logs/${type}?page=${page}`, {
        headers: this.getAuthHeaders(),
    }).pipe(
        timeout(15000),
        catchError(err => {
            if (err.name === 'TimeoutError') {
                return throwError(() => new Error('La requête a pris trop de temps.'));
            }
            return throwError(() => err);
        })
    );
}
}
