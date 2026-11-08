import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, inject } from '@angular/core';
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
    imports: [TranslatePipe, NavbarComponent, ReactiveFormsModule, CommonModule],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegisterComponent {
  private readonly i18n = inject(I18nService);
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
  //         let errorMessage = this.i18n.t('register.erreur_lors_de_l_inscription');
  //         if (error.error?.errors) {
  //           errorMessage += ' Détails : ' + JSON.stringify(error.error.errors);
  //         }
  //         Swal.fire({
  //           title: this.i18n.t('register.erreur'),
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
            title: this.i18n.t('login.verification_de_l_email'),
            text: this.i18n.t('register.veuillez_entrer_le_code_que_vous'),
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
              this.authService.verifyEmailCode(email, result.value).subscribe({
                next: (res: any) => {
                  localStorage.setItem('token', res.access_token);
                  localStorage.setItem('user', JSON.stringify(res.user));
                  localStorage.setItem('userId', res.user.id);

                  Swal.fire({
                    icon: 'success',
                    title: this.i18n.t('register.inscription_terminee'),
                    text: this.i18n.t('register.votre_compte_est_verifie_et_vous'),
                    timer: 2000
                  }).then(() => {
                    this.router.navigate(['/accueil']);
                  });
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
        }, 1000); // 🕒 1 seconde d'attente

        this.registerForm.reset();
      },

      error: (error) => {
        this.isLoading = false;
        let errorMessage = this.i18n.t('register.erreur_lors_de_l_inscription');
        if (error.error?.errors) {
          errorMessage += ' Détails : ' + JSON.stringify(error.error.errors);
        }
        Swal.fire({
          title: this.i18n.t('register.erreur'),
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
      return this.i18n.t('register.ce_champ_est_requis');
    } else if (control?.hasError('minlength')) {
      return this.i18n.t('register.min_length', { n: control.errors?.['minlength'].requiredLength });
    } else if (control?.hasError('maxlength')) {
      return this.i18n.t('register.max_length', { n: control.errors?.['maxlength'].requiredLength });
    } else if (control?.hasError('pattern')) {
      return this.i18n.t('register.format_invalide');
    } else if (control?.hasError('email')) {
      return this.i18n.t('register.l_email_doit_etre_valide');
    }
    return '';
  }
}
