import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
    selector: 'app-newpass',
    imports: [TranslatePipe, NavbarComponent, CommonModule, ReactiveFormsModule],
    templateUrl: './newpass.component.html',
    styleUrls: ['./newpass.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class NewpassComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  newPasswordForm!: FormGroup;
  token!: string; // Pour capturer le token dans l'URL
  email!: string; // Si besoin, capturer l'email
  /** Lien d'activation d'un compte créé au guichet (même formulaire que « mot de passe oublié »). */
  activation = false;
  isLoading: boolean = false; // Variable pour contrôler l'affichage du loader
  showPassword = false;
  showConfirm = false;
  get passwordStrength(): number {
  const pw = this.newPasswordForm.get('password')?.value || '';
  if (pw.length === 0) return 0;
  if (pw.length < 6) return 25;
  if (pw.length < 10) return 60;
  return 100;
}

get strengthClass(): string {
  const s = this.passwordStrength;
  if (s <= 25) return 'weak';
  if (s <= 60) return 'medium';
  return 'strong';
}

get strengthLabel(): string {
  const s = this.passwordStrength;
  if (s <= 25) return this.i18n.t('newpass.faible');
  if (s <= 60) return this.i18n.t('newpass.moyen');
  return this.i18n.t('newpass.fort');
}


  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialiser le formulaire avec un validateur personnalisé pour comparer les mots de passe
    this.newPasswordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        password_confirmation: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );

    // Capturer le token depuis l'URL
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'];
      this.email = params['email']; // Si l'email est aussi passé dans l'URL
      this.activation = params['activation'] === '1';
    });
  }

  // Validateur personnalisé pour vérifier si les mots de passe correspondent
  passwordsMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const passwordConfirmation = group.get('password_confirmation')?.value;

    // Si les mots de passe ne correspondent pas, retourner une erreur
    return password === passwordConfirmation ? null : { passwordsMismatch: true };
  }

  onSubmit() {
    if (this.newPasswordForm.invalid) {
      return;
    }
    this.isLoading = true; // Activation du loader

    // Préparer les données à envoyer au backend
    const formData = {
      token: this.token,
      email: this.email,
      ...this.newPasswordForm.value, // Ajoute password et password_confirmation
    };

    // Appeler le service pour réinitialiser le mot de passe
    this.authService.resetPassword(formData).subscribe(
      (response) => {
        this.isLoading = false; // Désactivation du loader
        Swal.fire({
          icon: 'success',
          title: this.i18n.t('newpass.mot_de_passe_reinitialise'),
          text: this.i18n.t('newpass.votre_mot_de_passe_a_ete'),
          timer: 2000,
          timerProgressBar: true,
        }).then(() => {
          this.router.navigate(['/connexion']); // Redirige vers la page de connexion
        });
      },
      (error) => {
        this.isLoading = false; // Désactivation du loader
        Swal.fire({
          icon: 'error',
          title: this.i18n.t('detail.erreur'),
          text: error.error.message || this.i18n.t('newpass.une_erreur_est_survenue_lors_de'),
          timer: 2000,
          timerProgressBar: true,
        });
      }
    );
  }
}
