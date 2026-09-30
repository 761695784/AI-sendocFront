import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CounterApi } from '../../../core/api/counter.api';
import { FoundDocumentView, LaravelPage } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';

/** Documents trouvés sous la garde de la structure. */
@Component({
  selector: 'app-staff-documents',
  imports: [DatePipe, FormsModule, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Documents trouvés" subtitle="Sous la garde de la structure">
      @if (canDeposit()) {
        <a routerLink="depot" class="btn btn-dt"><i class="fas fa-camera me-1" aria-hidden="true"></i> Enregistrer un dépôt</a>
      }
    </app-page-header>

    <form class="dt-card dt-form d-flex flex-wrap gap-2 align-items-end mb-3" (ngSubmit)="load(1)">
      <div><label for="d-ref">Référence</label><input id="d-ref" name="ref" class="form-control dt-mono" [(ngModel)]="reference" placeholder="TR-2026-…" /></div>
      <div>
        <label for="d-status">Statut</label>
        <select id="d-status" name="status" class="form-select" [(ngModel)]="status">
          <option value="">Tous</option>
          <option value="in_custody">En garde</option>
          <option value="matched">Correspondance</option>
          <option value="restitution_pending">Restitution en attente</option>
          <option value="restituted">Restitué</option>
        </select>
      </div>
      <button type="submit" class="btn btn-outline-secondary">Filtrer</button>
    </form>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load(1)">Réessayer</button></app-error-state>
    } @else if (!page()?.data?.length) {
      <div class="dt-card"><app-empty-state icon="fa-id-card" title="Aucun document" text="Les documents déposés au guichet ou récupérés auprès des trouveurs apparaîtront ici." /></div>
    } @else {
      <div class="dt-card p-0 overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr><th>Référence</th><th>Pièce</th><th>Au nom de</th><th>En garde depuis</th><th>Statut</th></tr></thead>
            <tbody>
              @for (doc of page()!.data; track doc.uuid) {
                <tr [routerLink]="[doc.uuid]" style="cursor: pointer">
                  <td class="dt-mono small"><a [routerLink]="[doc.uuid]">{{ doc.reference }}</a></td>
                  <td>{{ doc.document_type.name }}</td>
                  <td>{{ doc.first_name }} {{ doc.last_name }}</td>
                  <td class="small text-nowrap">{{ doc.custody?.since | date: 'd MMM y' }}</td>
                  <td>
                    <app-status-badge [status]="doc.lifecycle_status" />
                    @if (hasConfirmedMatch(doc)) { <i class="fas fa-user-check text-success ms-1" title="Propriétaire identifié" aria-label="Propriétaire identifié"></i> }
                  </td>
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
export class StaffDocumentsListComponent implements OnInit {
  private readonly api = inject(CounterApi);
  private readonly session = inject(SessionStore);

  reference = '';
  status = '';
  readonly page = signal<LaravelPage<FoundDocumentView> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  canDeposit(): boolean {
    return this.session.can('found_documents.create');
  }

  hasConfirmedMatch(doc: FoundDocumentView): boolean {
    return (doc.matches ?? []).some((m) => m.status === 'confirmed');
  }

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.foundDocuments({ page, reference: this.reference.trim(), status: this.status }).subscribe({
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
