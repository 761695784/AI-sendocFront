import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PublisherPipe } from '../../shared/pipes/publisher.pipe';
import { FooterComponent } from './../footer/footer.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from './../navbar/navbar.component';
import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { PublicationsService } from '../services/publications.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

export interface Document {
  id: number;
  uuid:string;
  image: string;
  image_thumb: string;      // ← AJOUTE
  image_blurred: string;    // ← AJOUTE
  image_optimized: string;  // ← AJOUTE
  OwnerFirstName: string;
  OwnerLastName: string;
  Location: string;
  statut: string; // Peut être 'récupéré' ou 'non récupéré'
  document_type_id: number;
  user_id: number;
  custody?: { name: string; address?: string | null; phone?: string | null } | null;
  created_at: string;
  updated_at: string;
  user: null | {
    id: number;
    FirstName: string;
    LastName: string;
    Phone: string;
    Adress?: string;  // Optionnel
    email: string;
    email_verified_at?: string;  // Optionnel
  };
  document_type: null | {
    id: number;
    TypeName: string;
  }
}

@Component({
    selector: 'app-mypublish',
    imports: [TranslatePipe, PublisherPipe, NavbarComponent, FormsModule, ReactiveFormsModule, FooterComponent, CommonModule],
    templateUrl: './mypublish.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./mypublish.component.css'] // Corrigé de styleUrl à styleUrls
})
export class MypublishComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  publications: Document[] = [];
  trashedPublications: Document[] = []; // Pour stocker les documents supprimés
  showTrashed: boolean = false; // État pour afficher ou masquer les documents supprimés

  constructor(private publicationService: PublicationsService) {}

  // Au chargement du composant, on charge les publications de l'utilisateur connecté
  ngOnInit() {
    this.loadUserPublications();
  }

  // Charger les publications de l'utilisateur connecté
  loadUserPublications() {
    this.publicationService.getUserPublications().subscribe(
      (data: Document[]) => {
        this.publications = data;
      },
      error => {
        // console.error('Erreur lors de la récupération des publications', error);
      }
    );
  }

  // affichage de la liste des publications supprimées
  showTrashedDocuments() {
    this.showTrashed = true;
    this.loadTrashedDocuments();
  }

 // Charger les documents supprimés
loadTrashedDocuments() {
  this.publicationService.getTrashedDocuments().subscribe(
    (data: Document[]) => {
      this.trashedPublications = data;
    },
    error => {
      // console.error('Erreur lors du chargement des documents supprimés:', error);
    }
  );
}


  // Restaurer un document supprimé
  restorePublication(uuid: string): void {
    Swal.fire({
      title: this.i18n.t('mypub.etes_vous_sur_de_vouloir_restaurer'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.i18n.t('mypub.oui_restaurer'),
      cancelButtonText: this.i18n.t('rf.cancel')
    }).then((result) => {
      if (result.isConfirmed) {
        this.publicationService.restoreDocument(uuid).subscribe({
          next: (response) => {
            Swal.fire('Restauré!', response.message, 'success');
            this.loadTrashedDocuments(); // Recharger les documents supprimés
            this.loadUserPublications(); // Recharger les publications de l'utilisateur
          },
          error: (err) => {
            Swal.fire('Erreur!', 'Erreur lors de la restauration.', 'error');
          }
        });
      }
    });
  }

  // Supprimer une publication
  deletePublication(uuid: string): void {
    Swal.fire({
      title: this.i18n.t('mypub.etes_vous_sur_de_vouloir_supprimer'),
      text: this.i18n.t('lostdecl.cette_action_est_irreversible'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: this.i18n.t('mypub.oui_supprimer'),
      cancelButtonText: this.i18n.t('rf.cancel')
    }).then((result) => {
      if (result.isConfirmed) {
        this.publicationService.deletePublication(uuid).subscribe({
          next: () => {
            this.publications = this.publications.filter(publication => publication.uuid !== uuid);
            Swal.fire({
              title: this.i18n.t('mypub.supprime'),
              text: this.i18n.t('mypub.publication_supprimee_avec_succes'),
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (err) => {
            // console.error('Erreur lors de la suppression de la publication', err);
          }
        });
      }
    });
  }

  // methode pour le changement de statut
  toggleStatus(publication: Document): void {
    if (publication.user_id === this.getUserId()) {
      const newStatus = publication.statut === 'récupéré' ? 'non récupéré' : 'récupéré';

      Swal.fire({
        title: this.i18n.t('lostdecl.etes_vous_sur'),
        text: this.i18n.t('mypub.status_will_change', { s: this.i18n.fromFr(newStatus === 'récupéré' ? 'Récupéré' : 'Non récupéré') }),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: this.i18n.t('mypub.oui_changer'),
        cancelButtonText: this.i18n.t('rf.cancel')
      }).then((result) => {
        if (result.isConfirmed) {
          this.publicationService.updatePublicationStatus(publication.uuid, newStatus).subscribe({
            next: (response) => {
              publication.statut = response.document.statut;  // Mettre à jour le statut affiché
              Swal.fire({
                title: this.i18n.t('mypub.mise_a_jour'),
                text: this.i18n.t('mypub.status_changed', { s: this.i18n.fromFr(publication.statut === 'récupéré' ? 'Récupéré' : 'Non récupéré') }),
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
              });
            },
            error: (err) => {
              // console.error('Erreur lors de la mise à jour:', err);
              Swal.fire('Erreur!', 'Erreur lors de la mise à jour du statut.', 'error');
            }
          });
        }
      });
    } else {
      Swal.fire('Non autorisé', "Vous n'êtes pas autorisé à modifier ce statut.", 'error');
    }
  }

  // Méthode pour récupérer l'ID de l'utilisateur connecté stocké dans localStorage
  private getUserId(): number | null {
    const userId = localStorage.getItem('userId');
    return userId ? Number(userId) : null;
  }
}
