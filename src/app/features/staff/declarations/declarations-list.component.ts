import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CounterApi } from '../../../core/api/counter.api';
import { CounterDeclaration, LaravelPage } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';

/** Déclarations enregistrées au guichet par la structure (et ses sous-structures pour un responsable). */
@Component({
  selector: 'app-staff-declarations',
  imports: [DatePipe, FormsModule, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Déclarations de perte" subtitle="Enregistrées au guichet">
      @if (canCreate()) {
        <a routerLink="nouvelle" class="btn btn-dt"><i class="fas fa-plus me-1" aria-hidden="true"></i> Nouvelle déclaration</a>
      }
    </app-page-header>

    <form class="dt-card dt-form d-flex flex-wrap gap-2 align-items-end mb-3" (ngSubmit)="load(1)">
      <div>
        <label for="f-ref">Référence</label>
        <input id="f-ref" name="ref" class="form-control dt-mono" [(ngModel)]="reference" placeholder="DT-2026-…" />
      </div>
      <div>
        <label for="f-status">Statut</label>
        <select id="f-status" name="status" class="form-select" [(ngModel)]="status">
          <option value="">Tous</option>
          <option value="registered">Enregistrée</option>
          <option value="matched">Correspondance</option>
          <option value="restitution_in_progress">Restitution en cours</option>
          <option value="restituted">Restituée</option>
          <option value="cancelled">Annulée</option>
        </select>
      </div>
      <button type="submit" class="btn btn-outline-secondary">Filtrer</button>
    </form>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load(1)">Réessayer</button></app-error-state>
    } @else if (!page()?.data?.length) {
      <div class="dt-card"><app-empty-state icon="fa-file-alt" title="Aucune déclaration" text="Les déclarations enregistrées au guichet apparaîtront ici." /></div>
    } @else {
      <div class="dt-card p-0 overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr><th>Référence</th><th>Déclarant</th><th>Pièce(s)</th><th>Date</th><th>Statut</th></tr></thead>
            <tbody>
              @for (d of page()!.data; track d.uuid) {
                <tr class="cursor-pointer" [routerLink]="[d.uuid]">
                  <td class="dt-mono small"><a [routerLink]="[d.uuid]">{{ d.reference }}</a></td>
                  <td>{{ d.citizen?.first_name }} {{ d.citizen?.last_name }}</td>
                  <td class="small">{{ itemsLabel(d) }}</td>
                  <td class="small text-nowrap">{{ d.created_at | date: 'd MMM y' }}</td>
                  <td><app-status-badge [status]="d.status" /></td>
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
export class StaffDeclarationsListComponent implements OnInit {
  private readonly api = inject(CounterApi);
  private readonly session = inject(SessionStore);

  reference = '';
  status = '';
  readonly page = signal<LaravelPage<CounterDeclaration> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  canCreate(): boolean {
    return this.session.can('declarations.create');
  }

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.declarations({ page, reference: this.reference.trim(), status: this.status }).subscribe({
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

  itemsLabel(d: CounterDeclaration): string {
    return (d.items ?? []).map((i) => i.document_type?.name).filter(Boolean).join(', ') || '—';
  }
}
