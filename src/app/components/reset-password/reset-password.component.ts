import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [NavbarComponent, ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'], // Correction: 'styleUrl' => 'styleUrls'
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Ajoutez cette ligne
  
})
export class ResetPasswordComponent {
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
          title: 'Succès !',
          text: 'Un email de réinitialisation a été envoyé à votre adresse.',
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
          title: 'Erreur !',
          text: error.error.message || 'Une erreur est survenue. Veuillez réessayer.',
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
