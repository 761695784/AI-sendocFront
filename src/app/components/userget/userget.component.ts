import { AuthService } from './../services/auth.service';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
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
    imports: [CommonModule, FormsModule],
    templateUrl: './userget.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
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

  // Méthode pour supprimer un utilisateur (compte anonymisé côté API : ses déclarations et publications restent tracées)
  deleteUser(user: User): void {
    Swal.fire({
      title: 'Supprimer ce compte ?',
      html: `Le compte de <b>${this.escape(user.FirstName)} ${this.escape(user.LastName)}</b> sera supprimé et ses données personnelles effacées. `
        + 'Ses déclarations et publications restent dans l’historique, sans son nom.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c62828',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.deleteUser(user.uuid).subscribe({
          next: (res: any) => {
            Swal.fire('Compte supprimé', res?.message || 'L’utilisateur a été supprimé.', 'success');
            this.loadUsers();
          },
          error: (err) => {
            Swal.fire('Suppression impossible', err?.error?.message || 'Le compte n’a pas pu être supprimé. Réessayez.', 'error');
          }
        });
      }
    });
  }

  private escape(v: unknown): string {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
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
