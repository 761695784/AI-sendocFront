import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { PilotApi, inboxRoute } from '../../../core/api/pilot.api';
import { InboxMessage } from '../../../core/api/pilot.types';
import { LaravelPage } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';
import { InboxBadgeService } from '../shared/inbox-badge.service';

/** Icône selon le type d'événement (préfixe avant le point : collection.assigned → collection). */
const EVENT_ICONS: Record<string, string> = {
  collection: 'fa-people-arrows',
  match: 'fa-link',
  report: 'fa-file-invoice',
  vigilance: 'fa-shield-alt',
  restitution: 'fa-handshake',
  declaration: 'fa-file-alt',
};

/**
 * Boîte de réception de l'agent : messages des structures dont il est membre + messages personnels.
 * Un clic ouvre l'écran concerné (retrait, correspondance, rapport) et marque le message comme lu.
 */
@Component({
  selector: 'app-staff-messages',
  imports: [DatePipe, PageHeaderComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Boîte de réception" subtitle="Ce que la plateforme vous signale : retraits à traiter, correspondances, rapports, alertes">
      <button type="button" class="btn btn-outline-secondary" [disabled]="busy() || badge.unread() === 0" (click)="readAll()">
        <i class="fas fa-check-double me-1" aria-hidden="true"></i> Tout marquer comme lu
      </button>
    </app-page-header>

    <ul class="nav nav-pills mb-3">
      <li class="nav-item"><button type="button" class="nav-link" [class.active]="!unreadOnly()" (click)="filter(false)">Tous</button></li>
      <li class="nav-item"><button type="button" class="nav-link" [class.active]="unreadOnly()" (click)="filter(true)">Non lus @if (badge.unread() > 0) { <span class="badge bg-danger ms-1">{{ badge.unread() }}</span> }</button></li>
    </ul>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load(1)">Réessayer</button></app-error-state>
    } @else if (!page()?.data?.length) {
      <div class="dt-card"><app-empty-state icon="fa-inbox" [title]="unreadOnly() ? 'Aucun message non lu' : 'Aucun message'" text="Les rappels de délai, les nouveaux retraits et les rapports mensuels arrivent ici." /></div>
    } @else {
      <ul class="inbox list-unstyled mb-0">
        @for (m of page()!.data; track m.uuid) {
          <li>
            <button type="button" class="inbox__item" [class.inbox__item--unread]="!m.is_read" (click)="open(m)">
              <span class="inbox__icon" [class.inbox__icon--priority]="m.priority"><i class="fas {{ icon(m.event) }}" aria-hidden="true"></i></span>
              <span class="inbox__body">
                <span class="inbox__title">
                  @if (!m.is_read) { <span class="visually-hidden">Non lu : </span> }
                  {{ m.title }}
                  @if (m.priority) { <span class="badge text-bg-danger ms-1">Prioritaire</span> }
                </span>
                @if (m.body) { <span class="inbox__text">{{ m.body }}</span> }
                <span class="inbox__meta">{{ m.created_at | date: 'EEE d MMM, HH:mm' }}@if (m.organization) { · {{ m.organization.name }} }</span>
              </span>
              @if (route(m)) { <i class="fas fa-chevron-right inbox__go" aria-hidden="true"></i> }
            </button>
          </li>
        }
      </ul>
      <app-paginator [page]="page()" (pageChange)="load($event)" />
    }
  `,
  styles: `
    .inbox { background: #fff; border: 1px solid var(--bo-border, #e3e8ef); border-radius: var(--bo-radius, .75rem); box-shadow: var(--bo-shadow, none); overflow: hidden; }
    .inbox li + li { border-top: 1px solid #eef1f5; }
    .inbox__item { display: flex; gap: .9rem; align-items: flex-start; width: 100%; text-align: left; background: none; border: 0;
      padding: .9rem 1.1rem; color: inherit; }
    .inbox__item:hover, .inbox__item:focus-visible { background: var(--bo-row-hover, #f6f8fb); }
    .inbox__item--unread { background: var(--bo-unread, #f3f8ff); box-shadow: inset 3px 0 0 var(--bo-accent, transparent); }
    .inbox__item--unread .inbox__title { font-weight: 700; }
    .inbox__icon { flex: 0 0 2.2rem; height: 2.2rem; border-radius: 50%; display: grid; place-items: center; background: var(--bo-soft, #e8eef7); color: var(--bo-ink, #13294b); }
    .inbox__icon--priority { background: #fde8e8; color: #a52a2a; }
    .inbox__body { flex: 1; display: flex; flex-direction: column; gap: .15rem; min-width: 0; }
    .inbox__title { color: var(--bo-ink, #13294b); }
    .inbox__text { color: #3d4855; font-size: .92rem; }
    .inbox__meta { color: #6b7684; font-size: .8rem; }
    .inbox__go { color: #9aa5b1; align-self: center; }
  `,
})
export class StaffMessagesComponent implements OnInit {
  private readonly api = inject(PilotApi);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);
  readonly badge = inject(InboxBadgeService);

  readonly unreadOnly = signal(false);
  readonly page = signal<LaravelPage<InboxMessage> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  ngOnInit(): void {
    this.load(1);
    this.badge.refresh();
  }

  filter(unread: boolean): void {
    this.unreadOnly.set(unread);
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.inbox(this.unreadOnly(), page).subscribe({
      next: (p) => {
        this.page.set(p);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  icon(event: string): string {
    return EVENT_ICONS[event.split('.')[0]] ?? 'fa-envelope';
  }

  route(m: InboxMessage): string | null {
    return inboxRoute(m.link);
  }

  open(m: InboxMessage): void {
    if (!m.is_read) {
      this.api.markRead(m.uuid).subscribe({
        next: () => {
          this.badge.decrement();
          this.page.update((p) => (p ? { ...p, data: p.data.map((x) => (x.uuid === m.uuid ? { ...x, is_read: true } : x)) } : p));
        },
      });
    }
    const target = this.route(m);
    if (target) {
      this.router.navigateByUrl(target);
    }
  }

  readAll(): void {
    this.busy.set(true);
    this.api.markAllRead().subscribe({
      next: (res) => {
        this.busy.set(false);
        this.badge.set(0);
        this.notify.success(res.marked > 1 ? `${res.marked} messages marqués comme lus.` : 'Messages marqués comme lus.');
        this.load(this.page()?.current_page ?? 1);
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e);
      },
    });
  }
}
