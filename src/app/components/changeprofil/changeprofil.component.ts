import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { assetUrl } from './../services/imageUrl';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-changeprofil',
    imports: [TranslatePipe, NavbarComponent, FormsModule, ReactiveFormsModule, CommonModule],
    templateUrl: './changeprofil.component.html',
    styleUrls: ['./changeprofil.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChangeprofilComponent implements OnInit {
  private readonly i18n = inject(I18nService);

  profileForm: FormGroup;
  isLoading = false;
  qrCodeUrl: string | null = null;
  user: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      FirstName: ['', Validators.required],
      LastName:  ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      Adress:    ['', Validators.required],
      Phone:     ['', Validators.required],
      oldPassword:        [''],
      newPassword:        [''],
      newPasswordConfirm: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  // ── Chargement profil + QR code ──
  loadUserProfile() {
    // 1. Pré-remplir depuis localStorage pour un affichage immédiat
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.profileForm.patchValue({
          FirstName: parsed.FirstName || '',
          LastName:  parsed.LastName  || '',
          email:     parsed.email     || '',
          Adress:    parsed.Adress    || '',
          Phone:     parsed.Phone     || ''
        });
      } catch {}
    }

    // 2. Charger depuis l'API (source de vérité)
    this.authService.getUserProfile().subscribe({
      next: (response) => {
        this.user = response.user;
        this.qrCodeUrl = assetUrl(response.qr_code_url);
        this.profileForm.patchValue({
          FirstName: response.user.FirstName || '',
          LastName:  response.user.LastName  || '',
          email:     response.user.email     || '',
          Adress:    response.user.Adress    || '',
          Phone:     response.user.Phone     || ''
        });
      },
      error: () => {
        // Silencieux — le localStorage a déjà pré-rempli
      }
    });
  }

  // ── Validateur mot de passe ──
  passwordMatchValidator(form: FormGroup) {
    const np  = form.get('newPassword')?.value;
    const npc = form.get('newPasswordConfirm')?.value;
    return np === npc ? null : { passwordMismatch: true };
  }

  // ── Soumettre le profil ──
  onSubmit() {
    if (!this.profileForm.valid) {
      Swal.fire({
        icon: 'warning',
        title: this.i18n.t('profile.formulaire_invalide'),
        text: this.i18n.t('profile.veuillez_remplir_tous_les_champs_requis'),
        confirmButtonText: 'Ok'
      });
      return;
    }

    this.isLoading = true;
    const profileData = this.profileForm.value;

    // Mise à jour du profil
    this.authService.updateProfile(profileData).subscribe({
      next: () => {
        this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: this.i18n.t('profile.profil_mis_a_jour'),
          text: this.i18n.t('profile.vos_informations_ont_ete_mises_a'),
          confirmButtonText: 'Ok'
        }).then(() => this.router.navigate(['/accueil']));
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: this.i18n.t('detail.erreur'),
          // Ex. changement d'email sans le mot de passe actuel : le serveur explique quoi faire.
          text: err?.error?.errors?.current_password?.[0] ?? err?.error?.message ?? this.i18n.t('profile.une_erreur_s_est_produite_lors'),
          confirmButtonText: 'Ok'
        });
      }
    });

    // Changement de mot de passe si renseigné
    if (profileData.oldPassword && profileData.newPassword) {
      this.authService.changePassword({
        current_password:      profileData.oldPassword,
        new_password:          profileData.newPassword,
        new_password_confirmation: profileData.newPasswordConfirm
      }).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: this.i18n.t('profile.mot_de_passe_change'),
            text: this.i18n.t('profile.votre_mot_de_passe_a_ete'),
            confirmButtonText: 'Ok'
          });
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: this.i18n.t('profile.erreur_mot_de_passe'),
            text: this.i18n.t('profile.le_mot_de_passe_actuel_est'),
            confirmButtonText: 'Ok'
          });
        }
      });
    }
  }

  // ── QR Code : imprimer ──
  printQrCode() {
    const printContents = document.querySelector('.qr-code-print')?.outerHTML;
    if (!printContents) return;
    const original = document.body.innerHTML;
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;">
        ${printContents}
      </div>`;
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  }

  // ── QR Code : renouveler ──
  renewQrCode() {
    Swal.fire({
      title: this.i18n.t('profile.confirmer_le_renouvellement'),
      text: this.i18n.t('profile.voulez_vous_vraiment_generer_un_nouveau'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F6A500',
      cancelButtonColor:  '#31287C',
      confirmButtonText:  this.i18n.t('profile.oui_renouveler'),
      cancelButtonText:   this.i18n.t('rf.cancel')
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.isLoading = true;
      this.authService.renewQrCode().subscribe({
        next: (response) => {
          this.isLoading = false;
          this.qrCodeUrl = assetUrl(response.qr_code_url);
          if (this.user) {
            this.user.qr_code_expires_at = response.new_expiration;
          }
          Swal.fire({
            icon: 'success',
            title: this.i18n.t('profile.qr_code_renouvele'),
            text: this.i18n.t('profile.votre_nouveau_qr_code_est_disponible'),
            timer: 3000,
            showConfirmButton: false
          });
        },
        error: () => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: this.i18n.t('detail.erreur'),
            text: this.i18n.t('profile.echec_du_renouvellement_du_qr_code'),
            confirmButtonText: 'Ok'
          });
        }
      });
    });
  }

  // Gardé pour compatibilité mais plus nécessaire
  redirectToFoundQR() {
    this.router.navigate(['/code']);
  }
}
