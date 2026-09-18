import { AuthService } from './../services/auth.service';
import { Component } from '@angular/core';
import { SideheadersComponent } from '../sideheaders/sideheaders.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { DeclarationService } from '../services/declaration.service';
import { NgxPaginationModule } from 'ngx-pagination';
import { DocTypeService, DocType } from '../services/doc-type.service';

export interface Declaration {
  id: number;
  uuid: string;
  Title: string;
  user_id: number;
  document_id: number;
  FirstNameInDoc: string;
  LastNameInDoc: string;
  created_at: string;
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
  selector: 'app-admindeclaration',
  standalone: true,
  imports: [
    SideheadersComponent,
    CommonModule,
    FormsModule,
    NgxPaginationModule,
  ],
  templateUrl: './admindeclaration.component.html',
  styleUrl: './admindeclaration.component.css',
})
export class AdmindeclarationComponent {
  declarations: Declaration[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 12;
  totalPages: number = 0;
  filteredDeclarations: Declaration[] = [];
  documentTypes: DocType[] = [];
  searchTerm: string = '';
  selectedFilter: string = 'all';
  selectedType: number | null = null;
  pasderesultat: boolean = false;

  constructor(
    private declarationService: DeclarationService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private docTypeService: DocTypeService,
  ) {}

  // init pour charger les déclarations et les types de documents
  ngOnInit() {
    this.loadAllDeclarations();
    this.loadDocumentTypes();
  }

  // Fonction pour charger toutes les déclarations
  loadAllDeclarations() {
    this.declarationService.getAllDeclarations().subscribe(
      (list: any[]) => {
        this.declarations = list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        this.filteredDeclarations = this.declarations; // ← initialise
        this.totalPages = Math.ceil(
          this.declarations.length / this.itemsPerPage,
        );
      },
      (error) => console.error('Erreur:', error),
    );
  }

  // Fonction pour changer de page
  pageChanged(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
    }
  }

  // Fonction pour charger les types de documents
  loadDocumentTypes(): void {
    this.docTypeService.getDocumentTypes().subscribe({
      next: (types) => (this.documentTypes = types),
      error: (err) => console.error('Erreur types:', err),
    });
  }

  // Fonction pour obtenir les déclarations paginées
  get paginatedDeclarations(): Declaration[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDeclarations.slice(
      startIndex,
      startIndex + this.itemsPerPage,
    );
  }

  // Nouvelle méthode de suppression avec confirmation
  deleteDeclaration(uuid: string) {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Cette action est irréversible !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (result.isConfirmed) {
        this.declarationService.deleteDeclaration(uuid).subscribe(
          () => {
            this.declarations = this.declarations.filter(
              (d) => d.uuid !== uuid,
            );
            Swal.fire(
              'Supprimé!',
              'La déclaration a été supprimée avec succès.',
              'success',
            );
          },
          (error) => {
            // console.error('Erreur lors de la suppression de la déclaration', error);
            Swal.fire(
              'Erreur!',
              'Une erreur est survenue lors de la suppression.',
              'error',
            );
          },
        );
      }
    });
  }

  // Fonction pour filtrer les déclarations
  filterDeclarations(): void {
    this.currentPage = 1;
    this.pasderesultat = false;

    let results = this.declarations;

    // Filtre par type (deleted ou actif)
    if (this.selectedFilter === 'deleted') {
      results = results.filter((d) => (d as any).deleted_at);
    } else if (this.selectedFilter === 'active') {
      results = results.filter((d) => !(d as any).deleted_at);
    }

    // ← filtre par type
    if (this.selectedType) {
      results = results.filter(
        (d) => d.document_type?.id === +this.selectedType!,
      );
    }

    // Filtre par recherche texte
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      results = results.filter(
        (d) =>
          d.FirstNameInDoc.toLowerCase().includes(term) ||
          d.LastNameInDoc.toLowerCase().includes(term) ||
          d.Title.toLowerCase().includes(term) ||
          d.user?.FirstName?.toLowerCase().includes(term) ||
          d.user?.LastName?.toLowerCase().includes(term),
      );
    }
    // Mise à jour des résultats filtrés et du nombre total de pages
    this.filteredDeclarations = results;
    this.totalPages = Math.ceil(
      this.filteredDeclarations.length / this.itemsPerPage,
    );
    this.pasderesultat = this.filteredDeclarations.length === 0;
  }
}
