import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { filter, timer } from 'rxjs';
import { SessionStore } from '../../../core/session/session.store';
import { AuthService } from '../../../components/services/auth.service';
import { InboxBadgeService } from '../../staff/shared/inbox-badge.service';
import { ADMIN_MENU } from '../admin-menu';

/**
 * Mise en page de l'espace super admin, aux couleurs de l'administration DocTrack :
 * menu latéral violet avec l'élément actif doré, bandeau doré avec message défilant,
 * notifications et compte. Le périmètre est national (pas de sélecteur de structure).
 * Les écrans historiques (V1) et les nouveaux écrans s'affichent dans cette même mise en page ;
 * la classe « dt-bo » applique le thème de l'administration aux écrans partagés (doctrack-v2.css).
 */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgbDropdownModule],
  // « Eager » : les écrans historiques (V1) affichés dans cette mise en page modifient de simples propriétés
  // après leurs appels HTTP ; un parent OnPush les empêcherait de se rafraîchir (liste vide).
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css',
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
  /** Initiales affichées dans la pastille du compte (« Malcom Marna » → « MM »). */
  readonly initials = computed(() => initialsOf(this.displayName()));

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

export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
}
