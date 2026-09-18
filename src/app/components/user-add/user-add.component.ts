import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SideheadersComponent } from '../sideheaders/sideheaders.component';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-add',
  standalone: true,
  imports: [CommonModule, FormsModule, SideheadersComponent,  ReactiveFormsModule],
  templateUrl: './user-add.component.html',
  styleUrl: './user-add.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Ajoutez cette ligne

})
export class UserAddComponent implements OnInit {

  userForm!: FormGroup; // Formulaire pour ajouter un utilisateur
  isLoading: boolean = false; // Variable pour contrôler l'affichage du loader
  showPassword = false;
  showConfirm  = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.userForm = this.formBuilder.group({
      role: ['', Validators.required],
      FirstName: ['', [Validators.required, Validators.maxLength(40)]],
      LastName: ['', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]],
      Phone: ['', [Validators.required, Validators.maxLength(20)]],
      Adress: ['', [Validators.required, Validators.maxLength(100)]],
    },
    { validators: this.passwordMatchValidator });
  }

  // Soumission du formulaire
  onSubmit(): void {
    if (this.userForm.valid) {
      const formData = this.userForm.value;

      this.isLoading = true; // Activer le loader

      // Appel du service pour créer un utilisateur
      this.authService.addUser(formData).subscribe({
        next: (response) => {
          this.isLoading = false; // Désactiver le loader
          Swal.fire({
            icon: 'success',
            title: 'Utilisateur ajouté',
            text: 'L\'utilisateur a été ajouté avec succès !',
          });
          this.router.navigate(['/adminuser']); // Redirection après succès
        },
        error: (err) => {
          this.isLoading = false; // Désactiver le loader
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Une erreur est survenue lors de l\'ajout de l\'utilisateur.',
          });
        }
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Formulaire invalide',
        text: 'Veuillez remplir tous les champs requis.',
      });
    }
  }
  //redirection si annulatiion
  onCancel(): void {
    this.router.navigate(['/adminuser']);
  }

  // Validation personnalisée pour comparer les mots de passe
passwordMatchValidator(form: FormGroup) {
  return form.get('password')?.value === form.get('password_confirmation')?.value
    ? null : { mismatch: true };
}
}
