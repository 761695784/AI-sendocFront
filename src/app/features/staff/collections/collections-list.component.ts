import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CounterApi } from '../../../core/api/counter.api';
import { CollectionView, LaravelPage } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';

const TABS = [
  { status: '', label: 'En cours' },
  { status: 'collected', label: 'Récupérés' },
  { status: 'cancelled', label: 'Annulés' },
];

/** Documents à récupérer chez les trouveurs (publiés en ligne ou signalés par QR), prioritaires d'abord. */
@Component({
  selector: 'app-staff-collections',
  imports: [DatePipe, DecimalPipe, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Retraits chez les trouveurs" subtitle="Appeler le trouveur, fixer le rendez-vous, prendre le document en garde" />

    <ul class="nav nav-pills mb-3">
      @for (t of tabs; track t.label) {
        <li class="nav-item"><button type="button" class="nav-link" [class.active]="status() === t.status" (click)="select(t.status)">{{ t.label }}</button></li>
      }
    </ul>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load(1)">Réessayer</button></app-error-state>
    } @else if (!page()?.data?.length) {
      <div class="dt-card"><app-empty-state icon="fa-people-arrows" title="Aucun retrait" text="Quand un citoyen publie un document et accepte d'être contacté, la structure la plus proche le voit ici." /></div>
    } @else {
      <div class="dt-card p-0 overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr><th>Document</th><th>Trouvé à</th><th>Trouveur</th><th>Attribué</th><th>Statut</th></tr></thead>
            <tbody>
              @for (c of page()!.data; track c.uuid) {
                <tr [routerLink]="[c.uuid]" style="cursor: pointer">
                  <td>
                    @if (c.priority) { <i class="fas fa-star text-warning me-1" title="Propriétaire identifié : prioritaire" role="img" aria-label="Prioritaire"></i> }
                    <a [routerLink]="[c.uuid]">{{ c.document?.document_type }}</a>
                    <small class="d-block dt-muted">{{ c.document?.last_name }} {{ c.document?.first_name }}</small>
                  </td>
                  <td class="small">{{ c.document?.found_place }}@if (c.distance_km !== null) { <span class="dt-muted"> · {{ c.distance_km | number: '1.0-1' }} km</span> }</td>
                  <td class="small">{{ c.finder.name ?? '—' }}<br /><span class="dt-muted">{{ c.finder.phone }}</span></td>
                  <td class="small text-nowrap">{{ c.assigned_at | date: 'd MMM, HH:mm' }}</td>
                  <td><app-status-badge [status]="c.status" /></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      <app-paginator [page]="page()" (pageChange)="load($event)" />
    }
  `,
})
export class StaffCollectionsListComponent implements OnInit {
  private readonly api = inject(CounterApi);
  readonly tabs = TABS;
  readonly status = signal('');
  readonly page = signal<LaravelPage<CollectionView> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load(1);
  }

  select(status: string): void {
    this.status.set(status);
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.collections(this.status() || undefined, page).subscribe({
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
}
