import { Router } from '@angular/router';
import { AuthService } from './../services/auth.service';
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {

  menuOpen = false;
  userDropdownOpen = false;
  userInitial = '';

  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit() {
    try {
      const name = this.authService.getUserName();
      this.userInitial = name ? name.charAt(0).toUpperCase() : 'U';
    } catch (e) {
      this.userInitial = 'U';
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleUserDropdown() {
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown')) {
      this.userDropdownOpen = false;
    }
  }

  goToChangePassword(): void {
    this.userDropdownOpen = false;
    this.router.navigate(['/modify']);
  }

  logout(): void {
    this.userDropdownOpen = false;
    this.authService.logout();
    this.router.navigate(['/connexion']);
  }
}
