import { Router } from '@angular/router';
import { AuthService } from './../services/auth.service';
import { Component, OnInit, HostListener, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { SessionStore } from '../../core/session/session.store';
import { MEMBERSHIP_ROLE_LABELS } from '../../core/session/session.models';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-navbar',
    imports: [FormsModule, RouterModule],
    templateUrl: './navbar.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {

  menuOpen = false;
  userDropdownOpen = false;
  userInitial = '';

  readonly session = inject(SessionStore);

  /** Libellé du profil affiché sous le nom. */
  readonly roleLabel = computed(() => {
    if (this.session.isSuperAdmin()) {
      return 'Administrateur DocTrack';
    }
    const m = this.session.activeMembership();
    return m ? `${MEMBERSHIP_ROLE_LABELS[m.role] ?? m.role} · ${m.organization.name}` : 'Membre DocTrack';
  });

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
  }
}
