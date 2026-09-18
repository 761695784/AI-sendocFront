import { AuthService } from './../services/auth.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SideheadersComponent } from "../sideheaders/sideheaders.component";
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface User {
  id: number;
  uuid:string;
  LastName: string;
  FirstName: string;
  email: string;
  roles: string[];
  Adress: string;
  Phone: string;
}

@Component({
  selector: 'app-userget',
  standalone: true,
  imports: [ CommonModule, FormsModule, SideheadersComponent],
  templateUrl: './userget.component.html',
  styleUrls: ['./userget.component.css']
})
export class UsergetComponent implements OnInit {

  users: User[] = [];
  filteredUsers: User[] = []; // Pour stocker les utilisateurs filtrés
  currentPage: number = 1;
  itemsPerPage: number = 10; // Utilisateurs par page
  totalPages: number = 0;     // Nombre total de pages

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // Méthode pour charger tous les utilisateurs
  loadUsers(): void {
    this.authService.getAllUsers().subscribe({
      next: (response) => {
        if (response.success) {
          this.users = response.users.sort((a: User, b: User) => b.id - a.id); // Tri par ID du plus récent au plus ancien
          this.filteredUsers = this.users; // Par défaut, montrer tous les utilisateurs
          this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        }
      },
      // error: (err) => console.error('Erreur lors de la récupération des utilisateurs', err)
    });
  }

  // Méthode pour obtenir les utilisateurs paginés
  get paginatedUsers(): User[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Méthode pour changer de page
  pageChanged(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Méthode pour supprimer un utilisateur
  deleteUser(userId: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: "Cette action est irréversible !",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.deleteUser(userId).subscribe({
          next: () => {
            Swal.fire(
              'Supprimé !',
              'L\'utilisateur a été supprimé.',
              'success'
            );
            this.loadUsers(); // Recharge les utilisateurs après suppression
          },
          error: (err) => {
            Swal.fire(
              'Erreur !',
              'Vous ne pouvez pas supprimer un utilisateur de role Admin.',
              'error'
            );
            // console.error('Erreur lors de la suppression de l\'utilisateur', err);
          }
        });
      }
    });
  }

  // Méthode pour trier les utilisateurs
  sortUsers(key: keyof User): void {
    this.filteredUsers.sort((a, b) => {
      if (a[key] < b[key]) return -1;
      if (a[key] > b[key]) return 1;
      return 0;
    });
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.pageChanged(1); // Réinitialise à la première page après tri
  }

  // Méthode pour rediriger vers la page d'ajout
  addUser(): void {
    this.router.navigate(['admin/adminadd']);
  }
}
