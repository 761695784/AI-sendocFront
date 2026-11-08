import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../services/auth.service';

import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
    selector: 'app-reset-password',
    imports: [TranslatePipe, NavbarComponent, ReactiveFormsModule],
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css'], // Correction: 'styleUrl' => 'styleUrls'
    changeDetection: ChangeDetectionStrategy.Eager,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ResetPasswordComponent {
  private readonly i18n = inject(I18nService);
  resetPasswordForm: FormGroup; // FormGroup pour le formulaire
  isSubmitting: boolean = false; // Indicateur pour éviter des soumissions multiples
  isLoading: boolean = false; // Variable pour contrôler l'affichage du loader


  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    // Initialisation du formulaire
    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {

    // Si le formulaire n'est pas valide, ne pas soumettre
    if (this.resetPasswordForm.invalid) {
      return;
    }
    
    // Afficher le loader
    this.isLoading = true;

    // Récupérer l'email depuis le formulaire
    const email = this.resetPasswordForm.value.email;
    this.isSubmitting = true; // Début du chargement

    // Appel au service pour envoyer l'email
    this.authService.sendResetPasswordEmail(email).subscribe({
      next: () => {
        // Masquer le loader
        this.isLoading = false;
        // Affichage d'une alerte SweetAlert en cas de succès
        Swal.fire({
          icon: 'success',
          title: this.i18n.t('reset.succes'),
          text: this.i18n.t('reset.un_email_de_reinitialisation_a_ete'),
          timer: 2000,
          timerProgressBar: true
        });
        this.isSubmitting = false; // Fin du chargement
        this.resetPasswordForm.reset(); // Réinitialiser le formulaire
      },
      error: (error) => {
        // Masquer le loader
        this.isLoading = false;
        // Affichage d'une alerte SweetAlert en cas d'erreur
        Swal.fire({
          icon: 'error',
          title: this.i18n.t('reset.erreur'),
          text: error.error.message || this.i18n.t('reset.une_erreur_est_survenue_veuillez_reessay'),
          timer: 2000,
          timerProgressBar: true
        });
        this.isSubmitting = false; // Fin du chargement
      }
    });
  }

    // Méthode pour gérer le clic sur le bouton "Annuler"
    onCancel(): void {
      // Rediriger vers la page de connexion
      this.router.navigate(['/connexion']);
    }
}
