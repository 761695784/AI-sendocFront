import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NavbarComponent } from "../navbar/navbar.component";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

export interface User {
  LastName: string;
  FirstName: string;
  Adress: string;
  Phone: string;
  email: string;
  password: string;
  password_confirmation: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [NavbarComponent, ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Ajoutez cette ligne

})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading: boolean = false; // Variable pour contrôler l'affichage du loader
  showPassword = false;
  showConfirmPassword = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    /**
     * Construction du regles de validations des champs du formulaire d'inscription
     */

    this.registerForm = this.fb.group({
      LastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(25), Validators.pattern('^[a-zA-Z]+$')]],
      FirstName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern('^[a-zA-Z]+( [a-zA-Z]+)*$')]],  // Nouvelle regex pour plusieurs prénoms
      Adress: ['', [Validators.required, Validators.maxLength(50), Validators.pattern('^[a-zA-Z0-9 ,.-]+$')]],
      Phone: ['', [Validators.required, Validators.pattern('^\\+221(33|70|75|76|77|78)[0-9]{7}$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password_confirmation: ['', Validators.required],
      acceptPolicy: [false, Validators.requiredTrue], // La case doit être cochée
    });
  }

  ngOnInit(): void {
    // console.log('Register component initialized.');
  }
/**
 * message d'alertes pour notifier si l'inscription est reussie ou pas
 * accompagné de la redirection
 */
  // onSubmit(): void {
  //   if (this.registerForm.valid) {
  //     this.isLoading = true; // Début du chargement
  //     const userData: User = {
  //       ...this.registerForm.value,
  //       confirmation_password: this.registerForm.value.password
  //     };

  //     this.authService.register(userData).subscribe({
  //       next: (response) => {
  //         this.isLoading = false; // Fin du chargement
  //         Swal.fire({
  //           title: 'Succès!',
  //           text: 'Inscription réussie!',
  //           icon: 'success',
  //           confirmButtonText: 'OK'
  //         });

  //         setTimeout(() => {
  //           this.router.navigate(['/connexion']);
  //         }, 2000);
  //         this.registerForm.reset();
  //       },
  //       error: (error) => {
  //         this.isLoading = false; // Fin du chargement
  //         let errorMessage = 'Erreur lors de l\'inscription.';
  //         if (error.error?.errors) {
  //           errorMessage += ' Détails : ' + JSON.stringify(error.error.errors);
  //         }
  //         Swal.fire({
  //           title: 'Erreur!',
  //           text: errorMessage,
  //           icon: 'error',
  //           confirmButtonText: 'OK'
  //         });
  //       }
  //     });
  //   }
  // }

onSubmit(): void {
  if (this.registerForm.valid) {
    this.isLoading = true;
    const userData: User = {
      ...this.registerForm.value,
      confirmation_password: this.registerForm.value.password
    };

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading = false;

        const email = this.registerForm.get('email')?.value;

        // ✅ Attendre une petite seconde (important dans certains cas de latence backend)
        setTimeout(() => {
          Swal.fire({
            title: 'Vérification de l\'email',
            text: 'Veuillez entrer le code que vous avez reçu par mail.',
            input: 'text',
            inputLabel: 'Code de vérification',
            inputPlaceholder: 'Ex: 123456',
            showCancelButton: true,
            confirmButtonText: 'Vérifier',
            cancelButtonText: 'Annuler',
            inputValidator: (value) => {
              if (!value) return 'Le code est requis !';
              return null;
            }
          }).then((result) => {
            if (result.isConfirmed && result.value) {
              this.authService.verifyEmailCode(email, result.value).subscribe({
                next: (res: any) => {
                  localStorage.setItem('token', res.access_token);
                  localStorage.setItem('user', JSON.stringify(res.user));
                  localStorage.setItem('userId', res.user.id);

                  Swal.fire({
                    icon: 'success',
                    title: 'Inscription terminée',
                    text: 'Votre compte est vérifié et vous êtes connecté.',
                    timer: 2000
                  }).then(() => {
                    this.router.navigate(['/accueil']);
                  });
                },
                error: (err) => {
                  Swal.fire({
                    icon: 'error',
                    title: 'Code invalide',
                    text: 'Le code de vérification est incorrect.',
                    timer: 2000
                  });
                }
              });
            }
          });
        }, 1000); // 🕒 1 seconde d'attente

        this.registerForm.reset();
      },

      error: (error) => {
        this.isLoading = false;
        let errorMessage = 'Erreur lors de l\'inscription.';
        if (error.error?.errors) {
          errorMessage += ' Détails : ' + JSON.stringify(error.error.errors);
        }
        Swal.fire({
          title: 'Erreur!',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  }
}



  /**Methodes permettant l'affichage des messages d'erreur en dessous de chaque champ du formulaire */
  public getErrorMessage(controlName: string): string {
    const control = this.registerForm.get(controlName);
    if (control?.hasError('required')) {
      return 'Ce champ est requis.';
    } else if (control?.hasError('minlength')) {
      return 'Ce champ contenir au moins ' + control.errors?.['minlength'].requiredLength + ' caractères.';
    } else if (control?.hasError('maxlength')) {
      return ' Ce champ ne peut pas dépasser ' + control.errors?.['maxlength'].requiredLength + ' caractères.';
    } else if (control?.hasError('pattern')) {
      return 'Format invalide.';
    } else if (control?.hasError('email')) {
      return 'L\'email doit être valide.';
    }
    return '';
  }
}
