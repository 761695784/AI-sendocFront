  import { AuthService } from './../services/auth.service';
  import { FooterComponent } from './../footer/footer.component';
  import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
  import { ActivatedRoute } from '@angular/router';
  import { DetailsService } from '../services/details.service';
  import { NavbarComponent } from '../navbar/navbar.component';
  import { CommonModule } from '@angular/common';
  import { CommentairesService } from '../services/commentaire.service';
  import { FormsModule } from '@angular/forms';
  import Swal from 'sweetalert2';

  // Interface pour décrire les données du document
  export interface DocumentDetails {
    id: number;
    uuid: string;
    image: string | null;
    image_thumb: string;
    image_blurred: string;
    image_optimized: string;
    OwnerFirstName: string;
    OwnerLastName: string;
    Location: string;
    statut: string;
    document_type_id: number;
    identification: string;
    user_id: number;
    created_at: string;
    updated_at: string;
    user: {
      id: number;
      FirstName: string;
      LastName: string;
      Phone: string;
      Adress?: string;
      email: string;
      email_verified_at?: string;
    };
    document_type: {
      id: number;
      TypeName: string;
    };
  }
// Interface pour décrire les données du commentaire
  export interface Commentaire {
    id: number;
    uuid: string;
    contenu: string;
    document_id: number;
    user: {
      FirstName: string;
      LastName: string;
    };
    created_at: string;
  }

  @Component({
    selector: 'app-document-detail',
    standalone: true,
    imports: [NavbarComponent, FooterComponent, CommonModule, FormsModule],
    templateUrl: './document-detail.component.html',
    styleUrls: ['./document-detail.component.css'],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  })
  export class DocumentDetailComponent implements OnInit {
    documentDetails: DocumentDetails | null = null; // Utiliser le type DocumentDetails
    commentaires: Commentaire[] = []; // Ajout pour stocker les commentaires
    newComment: string = ''; // Pour stocker le contenu du nouveau commentaire
    isRestitutionRequested: boolean = false; // Ajout pour suivre l'état de la demande de restitution
    isOwner: boolean = false; // Variable pour suivre si l'utilisateur est le propriétaire
    isLoading: boolean = false; // Variable pour suivre l'état de chargement

    constructor(
      private route: ActivatedRoute,
      private detailsService: DetailsService,
      private commentairesService: CommentairesService,
      private authService: AuthService
    ) { }

    ngOnInit(): void {
      this.route.paramMap.subscribe(paramMap => {
        const documentUuid = paramMap.get('uuid');
        if (documentUuid) {
          this.getDocumentDetails(documentUuid);
          this.getCommentaires(documentUuid);
        } else {
          // console.error('Document UUID is null or undefined');
        }
      });
    }

      //Methode pour recuperer les details d'une publications
    getDocumentDetails(uuid: string): void {
        this.detailsService.getDocumentDetails(uuid).subscribe({
          next: (details) => {
            this.documentDetails = details;
            const currentUserId = +localStorage.getItem('userId')!;
            this.isOwner = currentUserId === this.documentDetails?.user.id;
          },
          error: (err) =>
             console.error('Erreur lors de la récupération des détails du document', err)
        });
    }


    //Methode d'affichage de commentaire
    getCommentaires(uuid: string): void {
      this.commentairesService.getCommentairesByDocument(uuid).subscribe({
        next: (comments) => {
          // console.log('Comments received:', comments);
          this.commentaires = comments;
        },
        error: (err) =>
           console.error('Erreur lors de la récupération des commentaires', err)
      });
    }

    // Méthode pour ajouter un commentaire
    addCommentaire(): void {
      if (this.authService.isAuthenticated() && this.newComment.trim() !== '' && this.documentDetails?.uuid !== undefined) {
        this.isLoading = true; // Affiche le loader
        const commentaireData = {
          contenu: this.newComment,
           // Utilisation de l'opérateur non-null assertion '!'
          document_id: this.documentDetails!.id
        };

        this.commentairesService.addCommentaire(commentaireData).subscribe({
          next: () => {
            this.newComment = '';
             // Utilisation de l'opérateur non-null assertion '!'
            this.getCommentaires(this.documentDetails?.uuid!);
            this.isLoading = false;
            Swal.fire({
              icon: 'success',
              title: 'Commentaire ajouté',
              text: 'Votre commentaire a été ajouté avec succès.',
              timer: 2000,
              showConfirmButton: true
            });
          },
          error: (err) => {
            // console.error('Erreur lors de l\'ajout du commentaire', err);
            this.isLoading = false;
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: 'Une erreur est survenue lors de l\'ajout de votre commentaire.',
              timer: 2000,
              showConfirmButton: false
            });
          }
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Non authentifié',
          text: 'Vous devez être authentifié pour ajouter un commentaire.',
          timer: 2000,
          showConfirmButton: true
        });
      }
    }

    // Méthode pour demander la restitution d'un document
    requestRestitution(): void {
      if (!this.isOwner && this.documentDetails) {
        // On affiche le loader dès le début
        this.isLoading = true;
        Swal.fire({
          title: 'Êtes-vous sûr ?',
          text: 'Vous êtes sur le point d\'envoyer une demande de restitution.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Oui, envoyer',
          cancelButtonText: 'Annuler'
        }).then((result) => {
          if (result.isConfirmed) {
            this.detailsService.requestRestitution(this.documentDetails!.uuid).subscribe({
              next: (response) => {
                this.isLoading = false;
                this.isRestitutionRequested = true;
                // Afficher le numéro de téléphone du publicateur dans la SweetAlert
                const phoneNumber = this.documentDetails?.user.Phone;
                Swal.fire({
                  icon: 'success',
                  title: 'Demande envoyée',
                  text: 'Votre demande de restitution a été envoyée avec succès.',
                  footer: phoneNumber ? `<p>Vous pouvez l'appeler au :📞  <strong>${phoneNumber}</strong></p>` : '',
                  // timer: 8000,
                  showConfirmButton: true
                });
              },
              error: (err) => {
                this.isLoading = false;
                if (err.status === 400 && err.error.success === false) {
                  Swal.fire({
                    icon: 'warning',
                    title: 'Demande déjà effectuée',
                    text: 'Vous avez déjà demandé la restitution de ce document.',
                    timer: 4000,
                    showConfirmButton: true
                  });
                } else {
                  Swal.fire({
                    icon: 'error',
                    title: 'Erreur',
                    text: 'Une erreur est survenue lors de la demande de restitution.',
                    timer: 2000,
                    showConfirmButton: false
                  });
                }
              }
            });
          } else {
            // En cas d'annulation, on cache le loader
            this.isLoading = false;
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Action interdite',
          text: 'Vous ne pouvez pas demander la restitution de votre propre document.',
          timer: 2000,
          showConfirmButton: false
        });
      }
    }


  }
