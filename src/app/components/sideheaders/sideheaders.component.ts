import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Component, OnInit, EventEmitter, Output, NgModule } from '@angular/core';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { PublicationsService } from '../services/publications.service';

export interface Notifications {
  id: number;
  message: string;
  is_read: boolean;
  document: {
    id: number;
  };
  declaration : {
    id: number;
  }
  }

@Component({
  selector: 'app-sideheaders',
  standalone: true,
  imports: [SidebarComponent,CommonModule,RouterModule, NgbModule],
  templateUrl: './sideheaders.component.html',
  styleUrl: './sideheaders.component.css'
})
export class SideheadersComponent implements OnInit {
  FirstName: string = '';
  documents: any[] = []; // Pour stocker les documents récupérés
  filteredDocuments: any[] = []; // Documents filtrés par la recherche
  searchQuery: string = ''; // Texte entré dans la barre de recherche
  searchTerm: string = '';
  @Output() searchEvent = new EventEmitter<string>();
  notifications: any[] = []; // Pour stocker les notifications
  unreadCount: number = 0; // Compteur des notifications non lues


  onSearch() {
    this.searchEvent.emit(this.searchTerm); // Émettre une chaîne de caractères
  }


  constructor(public authService: AuthService, private router: Router, publicationsService: PublicationsService) {}

  ngOnInit() {
    this.FirstName = this.authService.getUserName(); // Récupérer le nom de l'utilisateur
    this.getNotifications();

  }

      // Methode pour l'affichage des notifications et la decrementations du compteur
        getNotifications() {
          this.authService.getAllNotifications().subscribe(response => {
            this.notifications = response.data;
            this.unreadCount = this.notifications.filter(n => !n.is_read).length;
          });
        }

        // Methode pour marquer une notification comme lue
        markNotificationAsRead(notificationId: number) {
          this.authService.markNotificationAsRead(notificationId).subscribe(() => {
            const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex !== -1 && !this.notifications[notificationIndex].is_read) {
              this.notifications[notificationIndex].is_read = true;
              this.unreadCount--;
            }
          });
        }


    // Méthode pour supprimer une notification
      deleteNotification(notificationId: number) {
          // Trouve l'index de la notification
          const index = this.notifications.findIndex(n => n.id === notificationId);
          if (index !== -1) {
              // Supprime la notification de la liste
              this.notifications.splice(index, 1);
              // Mettez à jour le compteur si nécessaire
              this.unreadCount = this.notifications.filter(n => !n.is_read).length;
          }
      }


      // Méthode pour filtrer les documents selon la recherche
      searchDocuments(): void {
        const query = this.searchQuery.toLowerCase();
        this.filteredDocuments = this.documents.filter(document =>
          document.Title.toLowerCase().includes(query) || // Cherche dans le titre
          document.OwnerFirstName.toLowerCase().includes(query) || // Cherche dans le prénom
          document.OwnerLastName.toLowerCase().includes(query) // Cherche dans le nom
        );
      }

    // Méthode pour rediriger vers la page de changement de mot de passe
      goToChangePassword(): void {
        this.router.navigate(['/change-password']);
      }

    // Méthode pour se déconnecter
      logout() {
        this.authService.logout();
      }

}
