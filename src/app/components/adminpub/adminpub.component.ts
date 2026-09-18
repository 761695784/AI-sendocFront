import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { PublicationsService } from '../services/publications.service';
import { FooterComponent } from '../footer/footer.component';
import { SideheadersComponent } from '../sideheaders/sideheaders.component';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { DocTypeService, DocType } from '../services/doc-type.service';

export interface Document {
  id: number;
  uuid: string;
  image: string;
  image_thumb: string;
  image_blurred: string;
  image_optimized: string;
  OwnerFirstName: string;
  OwnerLastName: string;
  Location: string;
  statut: string;
  document_type_id: number;
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

@Component({
  selector: 'app-adminpub',
  standalone: true,
  imports: [SideheadersComponent, CommonModule, FormsModule],
  templateUrl: './adminpub.component.html',
  styleUrls: ['./adminpub.component.css'],
})
export class AdminpubComponent implements OnInit {
  documents: Document[] = [];
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 12;
  filteredDocuments: Document[] = [];
  deletedDocuments: Document[] = [];
  recoveredDocuments: Document[] = [];
  notRecoveredDocuments: Document[] = [];
  selectedFilter: string = 'all-publications';
  pasderesultat: boolean = false;
  documentTypes: DocType[] = [];
  selectedType: number | null = null;

  constructor(
    private publicationsService: PublicationsService,
    private router: Router,
    private docTypeService: DocTypeService,
  ) {}

  // Initialisation du composant
  ngOnInit(): void {
    this.loadAllPublications();
    this.loadDocumentTypes();
    this.publicationsService.getDeletedDocuments().subscribe({
      next: (documents) => (this.deletedDocuments = documents),
      error: (err) =>
        console.error(
          'Erreur lors de la récupération des documents supprimés:',
          err,
        ),
    });

    this.publicationsService.getRecoveredDocuments().subscribe({
      next: (documents) => (this.recoveredDocuments = documents),
      error: (err) =>
        console.error(
          'Erreur lors de la récupération des documents récupérés:',
          err,
        ),
    });

    this.publicationsService.getNotRecoveredDocuments().subscribe({
      next: (documents) => (this.notRecoveredDocuments = documents),
      error: (err) =>
        console.error(
          'Erreur lors de la récupération des documents non récupérés:',
          err,
        ),
    });
  }

  // Fonction pour charger toutes les publications
  loadAllPublications(): void {
    this.publicationsService.getAllDocumentsIncludingDeleted().subscribe({
      next: (docs) => {
        this.documents = docs.sort((a: Document, b: Document) => {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
        this.filteredDocuments = this.documents;
      },
      error: (err) =>
        console.error('Erreur lors de la récupération des publications', err),
    });
  }

  // Fonction pour charger les types de documents
  loadDocumentTypes(): void {
    this.docTypeService.getDocumentTypes().subscribe({
      next: (types) => (this.documentTypes = types),
      error: (err) => console.error('Erreur types:', err),
    });
  }

  // Fonction pour filtrer les documents
  filterDocuments(): void {
    this.currentPage = 1; // Réinitialiser à la première page
    this.pasderesultat = false; // Reset the pasderesultat flag

    // Filtrer les documents en fonction du terme de recherche
    let documents = this.documents;
    if (this.searchTerm) {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      documents = documents.filter(
        (document) =>
          document.OwnerFirstName.toLowerCase().includes(lowerCaseSearchTerm) ||
          document.OwnerLastName.toLowerCase().includes(lowerCaseSearchTerm),
      );
    }

    // Filtrer en fonction du statut sélectionné
    if (this.selectedFilter) {
      if (this.selectedFilter === 'softdeleted') {
        documents = this.deletedDocuments;
      } else if (this.selectedFilter === 'récupéré') {
        documents = this.recoveredDocuments;
      } else if (this.selectedFilter === 'non récupéré') {
        documents = this.notRecoveredDocuments;
      }
    }

    // Filtrer en fonction du type de document sélectionné
    if (this.selectedType) {
      documents = documents.filter(
        (d) => d.document_type?.id === +this.selectedType!,
      );
    }

    // Mettre à jour les documents filtrés
    this.filteredDocuments = documents;

    // Vérifier s'il y a des résultats filtrés et mettre à jour pasderesultat
    this.pasderesultat = this.filteredDocuments.length === 0;
  }

  // Fonction pour afficher les détails d'une publication
  viewDetails(uuid: string): void {
    this.router.navigate(['/admin/admindetails', uuid]);
  }

  // Fonction pour changer de page
  pageChanged(page: number): void {
    this.currentPage = page;
  }

  // Fonction pour obtenir les publications paginées
  get paginatedDocuments(): Document[] {
    const docsToPaginate =
      this.filteredDocuments.length > 0
        ? this.filteredDocuments
        : this.documents;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return docsToPaginate.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Fonction pour obtenir le nombre total de pages
  get totalPages(): number {
    return Math.ceil(this.documents.length / this.itemsPerPage);
  }

  // Fonction pour supprimer une publication
  deletePublication(uuid: string): void {
    if (uuid) {
      Swal.fire({
        title: 'Êtes-vous sûr de vouloir supprimer cette publication ?',
        text: 'Cette action est irréversible !',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Oui, supprimer!',
        cancelButtonText: 'Annuler',
      }).then((result) => {
        if (result.isConfirmed) {
          this.publicationsService.deletePublication(uuid).subscribe({
            next: () => {
              Swal.fire({
                title: 'Supprimé!',
                text: 'Publication supprimée avec succès.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
              });
              this.loadAllPublications();
            },
            error: (err) => {
              Swal.fire({
                title: 'Erreur',
                text: 'Une erreur est survenue lors de la suppression.',
                icon: 'error',
              });
            },
          });
        }
      });
    }
  }
}
