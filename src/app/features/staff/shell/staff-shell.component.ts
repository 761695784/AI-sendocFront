import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { catchError, filter, of, switchMap, timer } from 'rxjs';
import { SessionStore } from '../../../core/session/session.store';
import { ApiV2Client } from '../../../core/api/api-v2.client';
import { AuthService } from '../../../components/services/auth.service';
import { OrgSwitcherComponent } from '../../../shared/org-switcher/org-switcher.component';
import { STAFF_MENU, StaffMenuSection } from '../staff-menu';

/**
 * Mise en page de l'espace des structures : menu latéral selon les droits,
 * barre du haut (structure active, messages non lus, compte).
 */
@Component({
  selector: 'app-staff-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgbDropdownModule, OrgSwitcherComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './staff-shell.component.html',
  styleUrl: './staff-shell.component.css',
})
export class StaffShellComponent implements OnInit {
  private readonly session = inject(SessionStore);
  private readonly api = inject(ApiV2Client);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayName = this.session.displayName;
  readonly isSuperAdmin = this.session.isSuperAdmin;
  readonly unread = signal(0);
  readonly menuOpen = signal(false);

  /** Menu filtré selon les droits de la structure active. */
  readonly menu = computed<StaffMenuSection[]>(() => {
    this.session.abilities(); // dépendance : recalcul au changement de structure
    return STAFF_MENU.map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.abilities || this.session.canAny(item.abilities)),
    })).filter((section) => section.items.length > 0);
  });

  ngOnInit(): void {
    // Droits détaillés (la réponse de /login ne les contient pas).
    this.session.loadMemberships().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    // Messages non lus : au chargement puis toutes les 2 minutes.
    timer(0, 120_000)
      .pipe(
        switchMap(() => this.api.get<{ unread: number }>(['inbox', 'unread-count']).pipe(catchError(() => of({ unread: 0 })))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => this.unread.set(res.unread ?? 0));

    // Menu mobile refermé après chaque navigation.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.menuOpen.set(false));
  }

  /** Après un changement de structure : on recharge la page courante avec les données de la nouvelle structure. */
  onOrganizationChanged(): void {
    const url = this.router.url;
    this.router.navigateByUrl('/espace', { skipLocationChange: true }).then(() => this.router.navigateByUrl(url));
    this.api
      .get<{ unread: number }>(['inbox', 'unread-count'])
      .pipe(catchError(() => of({ unread: 0 })))
      .subscribe((res) => this.unread.set(res.unread ?? 0));
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  logout(): void {
    this.auth.logout();
  }
}
