import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import Swal from 'sweetalert2';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { PublicationsService } from '../services/publications.service';
import { AuthService } from '../services/auth.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-publishform',
  imports: [NavbarComponent, ReactiveFormsModule, CommonModule],
  standalone: true,
  templateUrl: './publishform.component.html',
  styleUrls: ['./publishform.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Ajoutez cette ligne

})
export class PublishformComponent {
  publishForm: FormGroup;
  maxFileSizeInMB = 5; // Taille maximale en Mo
  allowedFileTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']; // Types autorisés
  fileError: string | null = null; // Message d'erreur pour le fichier
  isLoading: boolean = false; // Variable pour afficher le loader

  documentTypes = [
    { id: 1, name: "Carte nationale d'identité" },
    { id: 2, name: "Passeport" },
    { id: 3, name: "Permis de conduire" },
    { id: 4, name: "Carte grise" },
    { id: 5, name: "Certificat de naissance" },
    { id: 6, name: "Diplômes Baccalauréat" },
    { id: 7, name: "Carte professionnelle" },
    { id: 8, name: "Carte bancaire" },
    { id: 9, name: "Attestation d'assurance" },
    { id: 10, name: "Carnet de santé" },
    { id: 11, name: "Carte d'étudiant" }
  ];

  constructor(
    private publicationsService: PublicationsService,
    private authService: AuthService,
    private fb: FormBuilder
  )
   /**
     * Construction du regles de validations des champs du formulaire de publication
     */
{
    this.publishForm = this.fb.group({
      image: ['', Validators.required],
      OwnerLastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(25), this.noSpecialCharsValidator]],
      OwnerFirstName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), this.noSpecialCharsValidator]],
      DocIdentification: [''],
      Location: ['', [Validators.required, Validators.maxLength(20), this.noSpecialCharsValidator]],
      documentType: ['', Validators.required],
      statut: ['non récupéré', Validators.required]
    });
  }

  // methode pour l'affichage des messages d'erreurs
  getErrorMessage(field: string): string {
    const control = this.publishForm.get(field);
    if (field === 'image') {
      return this.fileError || ''; // Afficher le message d'erreur du fichier
    }
    if (control?.hasError('required')) {
      return 'Ce champ est obligatoire';
    } else if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Ce champ doit contenir au moins ${minLength} caractères`;
    } else if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Ce champ ne doit pas dépasser ${maxLength} caractères`;
    } else if (control?.hasError('invalidChars')) {
      return 'Caractères non valides. Seules les lettres sont autorisées';
    }
    return '';
  }

  onSubmit() {
    if (this.publishForm.invalid) {
      this.publishForm.markAllAsTouched(); // Marque tous les champs comme touchés pour afficher les messages d'erreur
      return; // Ne pas afficher le SweetAlert tant que le formulaire est invalide
    }

  // Afficher le loader
    this.isLoading = true;


 // Préparation des données pour l'envoi
    const formData = new FormData();
    formData.append('image', this.publishForm.get('image')?.value);
    formData.append('OwnerLastName', this.publishForm.get('OwnerLastName')?.value);
    formData.append('OwnerFirstName', this.publishForm.get('OwnerFirstName')?.value);
    formData.append('DocIdentification', this.publishForm.get('DocIdentification')?.value);
    formData.append('Location', this.publishForm.get('Location')?.value);
    formData.append('document_type_id', this.publishForm.get('documentType')?.value);
    formData.append('statut', this.publishForm.get('statut')?.value);

    // Vérification de l'authentification avant de soumettre
    if (this.authService.isAuthenticated()) {
      this.publicationsService.addPublication(formData).subscribe(response => {
          // Masquer le loader après la réussite
          this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: 'Publication ajoutée !',
          text: 'Votre document a été publié avec succès.',
          timer: 2000,
          timerProgressBar: true
        });
        this.publishForm.reset();
      }, error => {
          // Masquer le loader en cas d'erreur
          this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur !',
          text: error.error.message || 'Une erreur est survenue lors de l\'ajout de votre document.',
          timer: 2000,
          timerProgressBar: true
        });
      });
    } else {
      this.isLoading = false;
      Swal.fire({
        icon: 'warning',
        title: 'Non authentifié !',
        text: 'Vous devez vous connecter pour publier un document.',
        timer: 2000,
        timerProgressBar: true
      });
    }
  }

  // Methode pour la validation de l'image fourni
  onFileChange(event: any) {
    const file = event.target.files[0];
    this.fileError = null; // Réinitialiser le message d'erreur

    if (file) {
      // Vérifier la taille du fichier
      const maxSizeInBytes = this.maxFileSizeInMB * 1024 * 1024; // Convertir en octets
      if (file.size > maxSizeInBytes) {
        this.fileError = `Le fichier doit être inférieur à ${this.maxFileSizeInMB} Mo.`;
        return;
      }

      // Vérifier le type de fichier
      if (!this.allowedFileTypes.includes(file.type)) {
        this.fileError = 'Seules les images au format JPEG, JPG, PNG et PDF sont acceptées.';
        return;
      }

      // Si tout est valide, mettre à jour le formulaire
      this.publishForm.patchValue({
        image: file
      });
    }
  }

  // Validation avec les regex
  noSpecialCharsValidator(control: any) {
    const regex = /^[a-zA-Z\s]+$/;
    if (control.value && !regex.test(control.value)) {
      return { invalidChars: true };
    }
    return null;
  }
}
