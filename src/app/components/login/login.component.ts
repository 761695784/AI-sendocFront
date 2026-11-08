import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { SessionStore } from '../../core/session/session.store';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2'; // Importer SweetAlert2
import { NavbarComponent } from '../navbar/navbar.component';
import { RedirectService } from '../services/redirection.service'; // Importer RedirectService
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-login',
    imports: [TranslatePipe, NavbarComponent, ReactiveFormsModule, CommonModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  loginForm: FormGroup;
  isLoading: boolean = false; // Variable pour contrôler l'affichage du loader
  isLocked: boolean = false; // Indique si l'utilisateur est bloqué
  lockoutTimeRemaining: number = 0; // Temps restant en secondes
  countdownInterval: any; // Pour le compte à rebours
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private redirectService: RedirectService,
    private router: Router,
    private session: SessionStore,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Déjà connecté : directement vers son espace.
    if (this.session.isAuthenticated()) {
      this.router.navigateByUrl(this.session.homeUrl());
      return;
    }
    // Arrivée ici après expiration de la session (voir core/http/error.interceptor.ts).
    if (this.route.snapshot.queryParamMap.get('expired')) {
      Swal.fire({
        icon: 'info',
        title: this.i18n.t('login.session_expiree'),
        text: this.i18n.t('login.pour_votre_securite_veuillez_vous_reconn'),
        timer: 4000,
      });
    }
  }

  /**
   * Après connexion : page demandée avant la connexion si elle existe,
   * sinon l'espace du profil (super admin → /admin, agent → /espace, citoyen → /accueil).
   */
  private goHome(): void {
    const redirectUrl = this.redirectService.getRedirectUrl();
    this.redirectService.clearRedirectUrl();
    this.router.navigateByUrl(redirectUrl && redirectUrl !== '/connexion' ? redirectUrl : this.session.homeUrl());
  }

  async loginWithGoogle() {
  }

  // Methode appelé lors du click du bouton submit
 onSubmit() {
  if (this.loginForm.valid && !this.isLocked) {
    this.isLoading = true;
    const loginData = this.loginForm.value;

    this.authService.login(loginData).subscribe(
      (response: any) => {
        this.isLoading = false;
        Swal.fire({
          title: this.i18n.t('login.connexion_reussie'),
          text: this.i18n.t('login.bienvenue'),
          icon: 'success',
          timer: 2000,
        }).then(() => {
          if (response.user && response.token) {
            this.goHome();
          }
        });
      },
      (error: HttpErrorResponse) => {
        this.isLoading = false;

        if (error.status === 429) {
          this.isLocked = true;
          const message = error.error?.message || '';
          const timeMatch = message.match(/Veuillez attendre (\d+) secondes/);
          this.lockoutTimeRemaining = timeMatch ? parseInt(timeMatch[1], 10) : 300;
          if (this.lockoutTimeRemaining > 0) {
            this.startCountdown();
            Swal.fire({
              title: this.i18n.t('login.trop_de_tentatives'),
              text: this.i18n.t('login.wait_seconds', { s: this.lockoutTimeRemaining }),
              icon: 'warning',
              timer: 3000,
            });
          }
        }

        // Email non vérifié : demander code + vérifier puis connecter
        else if (error.status === 403 && error.error?.message?.includes('Email non vérifié')) {
          Swal.fire({
            title: this.i18n.t('login.verification_de_l_email'),
            text: this.i18n.t('login.veuillez_entrer_le_code_recu_par'),
            input: 'text',
            inputLabel: this.i18n.t('verify.code_de_verification'),
            inputPlaceholder: 'Ex: 123456',
            showCancelButton: true,
            confirmButtonText: this.i18n.t('verify.verifier'),
            cancelButtonText: this.i18n.t('login.annuler'),
            inputValidator: (value) => {
              if (!value) return this.i18n.t('login.le_code_est_requis');
              return null;
            }
          }).then((result) => {
            if (result.isConfirmed && result.value) {
              const email = this.loginForm.get('email')?.value;

              // Appel à verifyEmailCode qui renvoie aussi le token
              this.authService.verifyEmailCode(email, result.value).subscribe({
                next: (res: any) => {
                  // Session démarrée par AuthService (l'API renvoie ici « access_token »)

                  Swal.fire({
                    icon: 'success',
                    title: this.i18n.t('login.email_verifie'),
                    text: this.i18n.t('login.connexion_automatique_reussie'),
                    timer: 2000
                  }).then(() => this.goHome());
                },
                error: (err) => {
                  Swal.fire({
                    icon: 'error',
                    title: this.i18n.t('login.code_invalide'),
                    text: this.i18n.t('login.le_code_de_verification_est_incorrect'),
                    timer: 2000
                  });
                }
              });
            }
          });
        }

        // Autres erreurs
        else {
          Swal.fire({
            title: this.i18n.t('login.echec_de_la_connexion'),
            text: error.error?.message || this.i18n.t('login.email_ou_mot_de_passe_incorrect'),
            icon: 'error',
            timer: 2000,
          });
        }
      }
    );
  } else if (this.isLocked) {
    Swal.fire({
      title: this.i18n.t('login.compte_bloque'),
      text: this.i18n.t('login.wait_seconds', { s: this.lockoutTimeRemaining }),
      icon: 'warning',
      timer: 2000,
    });
  } else {
    Swal.fire({
      title: this.i18n.t('detail.erreur'),
      text: this.i18n.t('login.veuillez_remplir_tous_les_champs_obligat'),
      icon: 'error',
      timer: 2000,
    });
  }
}


  startCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval); // Arrêter l'ancien intervalle si existant
    }
    this.countdownInterval = setInterval(() => {
      if (this.lockoutTimeRemaining > 0) {
        this.lockoutTimeRemaining--;
        console.log('Temps restant :', this.lockoutTimeRemaining); // Débogage
      } else {
        this.isLocked = false;
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

}
