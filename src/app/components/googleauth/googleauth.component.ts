import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2'; // Importer SweetAlert2
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-googleauth',
  standalone: true,
  imports: [NavbarComponent,ReactiveFormsModule, CommonModule],
  templateUrl: './googleauth.component.html',
  styleUrl: './googleauth.component.css'
})
// googleauth.component.ts
export class GoogleauthComponent {
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      Adress: ['', [Validators.required, Validators.maxLength(50), Validators.pattern('^[a-zA-Z0-9 ,.-]+$')]],
      Phone: ['', [Validators.required, Validators.pattern('^\\+221(33|70|75|76|77|78)[0-9]{7}$')]],
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const formData = this.registerForm.value;

      // Récupérer les données de l'utilisateur Google depuis le localStorage ou un service
      const googleUser = JSON.parse(localStorage.getItem('googleUser') || '{}');

      const userData = {
        email: googleUser.email,
        first_name: googleUser.first_name,
        last_name: googleUser.last_name,
        Adress: formData.Adress,
        Phone: formData.Phone,
      };

      // Appeler le service pour finaliser l'inscription

    } else {
      Swal.fire({
        title: 'Erreur',
        text: 'Veuillez remplir tous les champs correctement.',
        icon: 'error',
        timer: 2000,
      });
    }
  }

  public getErrorMessage(controlName: string): string {
    const control = this.registerForm.get(controlName);
    if (control?.hasError('maxlength')) {
      return 'Ce champ ne peut pas dépasser ' + control.errors?.['maxlength'].requiredLength + ' caractères.';
    } else if (control?.hasError('pattern')) {
      return 'Format invalide.';
    }
    return '';
  }
}
