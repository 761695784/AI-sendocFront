import { IMAGE_URL_BASE } from './../services/imageUrl';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-changeprofil',
  standalone: true,
  imports: [NavbarComponent, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './changeprofil.component.html',
  styleUrls: ['./changeprofil.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChangeprofilComponent implements OnInit {

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
        this.qrCodeUrl = `${IMAGE_URL_BASE}${response.qr_code_url}`;
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
        title: 'Formulaire invalide',
        text: 'Veuillez remplir tous les champs requis.',
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
          title: 'Profil mis à jour',
          text: 'Vos informations ont été mises à jour avec succès !',
          confirmButtonText: 'Ok'
        }).then(() => this.router.navigate(['/accueil']));
      },
      error: () => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur s\'est produite lors de la mise à jour.',
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
            title: 'Mot de passe changé',
            text: 'Votre mot de passe a été changé avec succès !',
            confirmButtonText: 'Ok'
          });
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Erreur mot de passe',
            text: 'Le mot de passe actuel est incorrect.',
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
      title: 'Confirmer le renouvellement',
      text: "Voulez-vous vraiment générer un nouveau QR code ? Vous devrez l'imprimer à nouveau.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F6A500',
      cancelButtonColor:  '#31287C',
      confirmButtonText:  'Oui, renouveler',
      cancelButtonText:   'Annuler'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.isLoading = true;
      this.authService.renewQrCode().subscribe({
        next: (response) => {
          this.isLoading = false;
          this.qrCodeUrl = `${IMAGE_URL_BASE}${response.qr_code_url}`;
          if (this.user) {
            this.user.qr_code_expires_at = response.new_expiration;
          }
          Swal.fire({
            icon: 'success',
            title: 'QR Code renouvelé !',
            text: 'Votre nouveau QR code est disponible.',
            timer: 3000,
            showConfirmButton: false
          });
        },
        error: () => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Échec du renouvellement du QR code.',
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
