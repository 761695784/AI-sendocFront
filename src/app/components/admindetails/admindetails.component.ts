import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SideheadersComponent } from '../sideheaders/sideheaders.component';
import { FooterComponent } from '../footer/footer.component';
import { Commentaire, DocumentDetails } from '../document-detail/document-detail.component';
import { PublicationsService } from '../services/publications.service';
import { DetailsService } from '../services/details.service';
import { CommentairesService } from '../services/commentaire.service';
import Swal from'sweetalert2';
import { AuthService } from '../services/auth.service';


@Component({
  selector: 'app-admindetails',
  standalone: true,
  imports: [SideheadersComponent,CommonModule,FormsModule],
  templateUrl: './admindetails.component.html',
  styleUrl: './admindetails.component.css',
   schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AdmindetailsComponent {
  // Déclaration des variables pour les données du document et des commentaires
  selectedDocumentId: number | null = null; // Utilisation du type number pour stocker l'ID du document sélectionné
  selectedCommentId: number | null = null; // Utilisation du type number pour stocker l'ID du commentaire sélectionné
  document: any; // Utilisation du type any pour stocker les données du document
  documentDetails: DocumentDetails | null = null; //Utilisation du type DocumentDetails
  selectedDocumentDetails: DocumentDetails | null = null;
  commentaires: Commentaire[] = []; // Ajouté pour stocker les commentaires
  newComment: string = ''; // Pour stocker le contenu du nouveau commentaire
  publications: Document[] = [];
  isLoading: boolean = false;

  constructor(private publicationsService: PublicationsService,private detailsService: DetailsService,private commentairesService: CommentairesService,private route: ActivatedRoute, private authService: AuthService) {}

  //rechargement du composant
  ngOnInit(): void {
    this.route.paramMap.subscribe(paramMap => {
      const documentUuid = paramMap.get('uuid'); // Change 'id' en 'uuid'
      if (documentUuid) {
        this.getDocumentDetails(documentUuid); // Passe directement le uuid (string)
        this.getCommentaires(documentUuid); // Idem pour les commentaires
      } else {
        console.error('Document UUID is null or undefined');
      }
    });
  }


  // Methode pour affichage des details d'un document pour l'admin
  getDocumentDetails(uuid: string): void {
    this.detailsService.getDocumentDetails(uuid).subscribe({
      next: (details) => {
        this.documentDetails = details;
      }
    })
  }

  // Methode pour affichage des commentaires d'un document
  getCommentaires(uuid: string): void {
    this.commentairesService.getCommentairesByDocument(uuid).subscribe({
      next: (comments) => {
        this.commentaires = comments;
      },
      // error: (err) => console.error('Erreur lors de la récupération des commentaires', err)
    });
  }


  // Méthode pour ajouter un commentaire
  addCommentaire(): void {
    if (this.authService.isAuthenticated() && this.newComment.trim() !== '' && this.documentDetails?.id !== undefined) {
      this.isLoading = true; // Affiche le loader
      // Création du commentaire avec son contenu et son ID du document
      const commentaireData = {
        contenu: this.newComment,
        document_id: this.documentDetails!.id // Utilisation de l'opérateur non-null assertion '!'
      };

      this.commentairesService.addCommentaire(commentaireData).subscribe({
        next: () => {
          this.newComment = '';
          this.getCommentaires(this.documentDetails?.uuid!); // Utilisation de l'opérateur non-null assertion '!'
          this.isLoading = false; // Cache le loader
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
          this.isLoading = false; // Cache le loader
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

}
