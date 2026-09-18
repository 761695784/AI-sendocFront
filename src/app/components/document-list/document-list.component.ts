import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PublicationsService } from './../services/publications.service';
import { FooterComponent } from './../footer/footer.component';
import { NavbarComponent } from './../navbar/navbar.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Document {
  id: number;
  uuid:string;
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
  selector: 'app-document-list',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, CommonModule, FormsModule],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.css'],
})
export class DocumentListComponent implements OnInit {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 12;

  constructor(
    private publicationsService: PublicationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchDocuments();
  }

  // Methode pour charger tous les documents
fetchDocuments(): void {
  this.publicationsService.getAllPublications().subscribe({
    next: (data) => {
      console.log('Documents fetched (après mapping):', data);

      if (data && data.length > 0) {
        this.documents = [...data].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.filteredDocuments = [...this.documents];
        this.currentPage = 1;
      } else {
        this.documents = [];
        this.filteredDocuments = [];
        console.warn('Aucun document reçu après mapping');
      }
    },
    error: (err) => {
      console.error('Failed to fetch documents', err);
    }
  });
}

  // methode de filtrage les document lors de la recherche
  filterDocuments(): void {
    // console.log('Search Term:', this.searchTerm);
    if (this.searchTerm) {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      this.filteredDocuments = this.documents.filter(
        (document) =>
          document.OwnerFirstName.toLowerCase().includes(lowerCaseSearchTerm) ||
          document.OwnerLastName.toLowerCase().includes(lowerCaseSearchTerm)
      );
      // console.log('Filtered Documents:', this.filteredDocuments);
    } else {
      // Si le champ de recherche est vide, affiche tous les documents
      this.filteredDocuments = this.documents;
      // console.log('No search term, showing all documents.');
    }
  }

  //Methode pour la redirection vers un document specific
  viewDetails(uuid: string): void {
    this.router.navigate(['/document', uuid]);
  }

  // Methode pour la redirection vers mes publications
  goToMyPublications(): void {
    this.router.navigate(['/mypub']);
  }

  // Methode d'affichage du numero de la page courante
  pageChanged(page: number): void {
    this.currentPage = page;
  }

  // Methode pour la pagination
  get paginatedFilteredDocuments(): Document[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDocuments.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  // Methode d'affichage des document de la page paginée
  get paginatedDocuments(): Document[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.documents.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // methode affichant le nombre totale des pages
  get totalPages(): number {
    return Math.ceil(this.documents.length / this.itemsPerPage);
  }
}
