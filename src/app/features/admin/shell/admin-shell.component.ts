import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { filter, timer } from 'rxjs';
import { SessionStore } from '../../../core/session/session.store';
import { AuthService } from '../../../components/services/auth.service';
import { InboxBadgeService } from '../../staff/shared/inbox-badge.service';
import { ADMIN_MENU } from '../admin-menu';

/**
 * Mise en page de l'espace super admin : même présentation que l'espace des structures
 * (menu latéral, barre du haut, messages non lus), sans sélecteur de structure : le périmètre est national.
 * Les écrans historiques (V1) s'affichent aussi dans cette mise en page.
 */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgbDropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-shell.component.html',
  styleUrls: ['../../staff/shell/staff-shell.component.css', './admin-shell.component.css'],
})
export class AdminShellComponent implements OnInit {
  private readonly session = inject(SessionStore);
  private readonly badge = inject(InboxBadgeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly menu = ADMIN_MENU;
  readonly displayName = this.session.displayName;
  readonly isStaff = this.session.isStaff;
  readonly unread = this.badge.unread;
  readonly menuOpen = signal(false);

  ngOnInit(): void {
    timer(0, 120_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.badge.refresh());
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.menuOpen.set(false));
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  logout(): void {
    this.auth.logout();
  }
}
