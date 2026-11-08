import { PublisherPipe } from '../../shared/pipes/publisher.pipe';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { PublicationsService } from './../services/publications.service';
import { Document } from '../document-list/document-list.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MapComponent } from '../map/map.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
    selector: 'app-landing',
    imports: [PublisherPipe, NavbarComponent, FooterComponent, FormsModule, CommonModule, MapComponent, TranslatePipe],
    templateUrl: './landing.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  searchTerm: string = '';
  documents: Document[] = [];
  filteredDocuments: Document[] = [];

  /** Partenaires et soutiens affichés dans le bandeau défilant (« tall » : logo vertical, affiché plus haut). */
  readonly partners = [
    { name: 'PNUD', logo: '/assets/partners/logo-pnud.webp', tall: true },
    { name: 'timbuktoo', logo: '/assets/partners/logo-timbuktoo.webp', tall: false },
    { name: 'METI', logo: '/assets/partners/logo-meti.webp', tall: false },
    { name: 'Simplon Sénégal', logo: '/assets/partners/logo-simplon-senegal.webp', tall: true },
  ];
  /** 4 séries identiques : la bande se décale de moitié puis recommence, sans vide à l'écran. */
  readonly partnerLoops = [0, 1, 2, 3];

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
