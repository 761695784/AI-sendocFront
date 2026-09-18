import { Component, OnInit } from '@angular/core';
import { PublicationsService } from './../services/publications.service';
import { Document } from '../document-list/document-list.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MapComponent } from '../map/map.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, FormsModule, CommonModule,MapComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  searchTerm: string = '';
  documents: Document[] = [];
  filteredDocuments: Document[] = [];

  constructor(private publicationsService: PublicationsService, private router: Router) {}


  ngOnInit(): void {
    this.fetchDocuments();
  }

  // Méthode pour charger tous les documents
  fetchDocuments(): void {
    this.publicationsService.getAllPublications().subscribe({
      next: (data) => {
        // console.log('Documents fetched:', data);
        this.documents = data;
        this.filteredDocuments = data;
      },
      // error: (err) => console.error('Failed to fetch documents', err)
    });
  }

  // Méthode pour filtrer les documents
  filterDocuments(): void {
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
    this.filteredDocuments = this.documents.filter(document =>
      document.OwnerFirstName.toLowerCase().includes(lowerCaseSearchTerm) ||
      document.OwnerLastName.toLowerCase().includes(lowerCaseSearchTerm)
    );
    // console.log('Filtered Documents:', this.filteredDocuments);
  }

  // Methode pour la redirection vers les details de la publications
  viewDetails(uuid: string): void {
    this.router.navigate(['/document', uuid]);
  }
}
