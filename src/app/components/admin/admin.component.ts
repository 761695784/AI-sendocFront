import { PublicationTypeChartComponent } from './../publication-type-chart/publication-type-chart.component';
import { FormsModule } from '@angular/forms';
import { SideheadersComponent } from './../sideheaders/sideheaders.component';
import { AuthService } from './../services/auth.service';
import { SidebarComponent } from './../sidebar/sidebar.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailActivityChartComponent } from '../email-activity-chart/email-activity-chart.component';


@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, SideheadersComponent, FormsModule,PublicationTypeChartComponent, EmailActivityChartComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {

  emailLogs: any[] = [];
  documents: any[] = [];
  searchTerm: string = '';
  filteredDocuments: any[] = [];
  filteredEmailLogs: any[] = []; // Pour stocker les emails filtrés
  declarationsCount: number = 0;
  publicationsCount: number = 0;
  emailsSentCount: number = 0;
  restitutionCount: number = 0;
  currentPage: number = 1;
  itemsPerPage: number = 10; // Emails par page
  totalPages: number = 0;     // Nombre total de pages
  isShowingRestitutionHistory: boolean = false; // Contrôle pour afficher les restitutions

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loadEmailLogs();
    this.loadAllData();
    this.loadRestitutionCount();
  }

  // Méthode pour charger les logs d'emails avec la pagination
  loadEmailLogs() {
    this.authService.getAllEmailLogs().subscribe(
      (response) => {
        // Trier les emails par date décroissante (du plus récent au plus ancien)
        this.emailLogs = response.data.sort((a: any, b: any) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        this.filteredEmailLogs = this.emailLogs; // Par défaut, on montre tous les emails
        this.totalPages = Math.ceil(this.filteredEmailLogs.length / this.itemsPerPage);
      },
      (error) => {
        // console.error('Erreur lors du chargement des logs d\'emails:', error);
      }
    );
  }

  // Méthode pour obtenir les emails paginés
  get paginatedEmailLogs(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredEmailLogs.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Méthode pour changer de page
  pageChanged(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Méthode pour afficher uniquement les emails de demandes de restitution// Méthode pour afficher ou masquer les emails de demandes de restitution
showRestitutionHistory(): void {
  if (this.isShowingRestitutionHistory) {
    // Si actuellement en mode restitution, revenir à l'état initial
    this.isShowingRestitutionHistory = false;
    this.filteredEmailLogs = this.emailLogs; // Réinitialise les emails filtrés
    this.currentPage = 1; // Réinitialise à la première page
    this.totalPages = Math.ceil(this.filteredEmailLogs.length / this.itemsPerPage);
  } else {
    // Afficher l'historique des restitutions
    this.isShowingRestitutionHistory = true;
    this.filteredEmailLogs = this.emailLogs.filter((email) => {
      return email.subject.includes('Demande de restitution');
    });
    this.currentPage = 1; // Réinitialise à la première page
    this.totalPages = Math.ceil(this.filteredEmailLogs.length / this.itemsPerPage);
  }
}

  // Méthode pour charger toutes les données au niveau des stat-box
  loadAllData(): void {
    this.authService.getAllData().subscribe(data => {
      this.declarationsCount = data.declarations.length;
      this.publicationsCount = data.publications.length;
      this.emailsSentCount = data.emailsSent.length;
    });
  }

  // Méthode pour charger le nombre de demandes de restitution au niveau du stat-box
  loadRestitutionCount(): void {
    this.authService.getRestitutionRequestCount().subscribe({
      next: (data) => {
        this.restitutionCount = data.count;
      },
      error: (error) => {
        // console.error('Erreur lors de la récupération du compte des restitutions', error);
      }
    });
  }

  // Méthode pour filtrer les publications par nom ou prénom
  onSearch(searchTerm: string): void {
    this.filteredDocuments = this.documents.filter(doc =>
      doc.user.FirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user.LastName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

}
