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
import { NotifyService } from '../../../shared/feedback/notify.service';

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
            <thead class="table-light"><tr><th>Référence</th><th>Pièce</th><th>Au nom de</th><th>En garde depuis</th><th>Statut</th><th class="text-end"><span class="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              @for (doc of page()!.data; track doc.uuid) {
                <tr [routerLink]="[doc.uuid]" style="cursor: pointer">
                  <td class="dt-mono small"><a [routerLink]="[doc.uuid]">{{ doc.reference }}</a></td>
                  <td>{{ doc.document_type.name }}</td>
                  <td>{{ doc.first_name }} {{ doc.last_name }}</td>
                  <td class="small text-nowrap">{{ doc.custody?.since | date: 'd MMM y' }}</td>
                  <td>
                    <app-status-badge [status]="doc.lifecycle_status" />
                    @if (hasConfirmedMatch(doc)) { <i role="img" class="fas fa-user-check text-success ms-1" title="Propriétaire identifié" aria-label="Propriétaire identifié"></i> }
                  </td>
                  <td class="text-end">
                    @if (canDelete(doc)) {
                      <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="deleting() === doc.uuid"
                        (click)="remove(doc, $event)" title="Supprimer définitivement" [attr.aria-label]="'Supprimer définitivement ' + doc.reference">
                        <i class="fas" [class.fa-trash-alt]="deleting() !== doc.uuid" [class.fa-spinner]="deleting() === doc.uuid" [class.fa-spin]="deleting() === doc.uuid" aria-hidden="true"></i>
                      </button>
                    }
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
  private readonly notify = inject(NotifyService);

  reference = '';
  status = '';
  readonly page = signal<LaravelPage<FoundDocumentView> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deleting = signal<string | null>(null);

  canDeposit(): boolean {
    return this.session.can('found_documents.create');
  }

  /** Seul un dépôt du guichet encore en garde, sans propriétaire identifié, peut être supprimé. */
  canDelete(doc: FoundDocumentView): boolean {
    return this.canDeposit() && doc.found_channel === 'counter' && doc.lifecycle_status === 'in_custody' && !this.hasConfirmedMatch(doc);
  }

  async remove(doc: FoundDocumentView, event: Event): Promise<void> {
    event.stopPropagation(); // la ligne ouvre la fiche
    const ok = await this.notify.confirm({
      title: 'Supprimer définitivement ?',
      text: `Le document ${doc.reference} (${doc.first_name} ${doc.last_name}) et sa photo seront effacés. Il n'y a pas de corbeille : cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.deleting.set(doc.uuid);
    this.api.deleteFoundDocument(doc.uuid).subscribe({
      next: (res) => {
        this.deleting.set(null);
        this.notify.success(res.message);
        const p = this.page();
        this.load(p && p.data.length === 1 && p.current_page > 1 ? p.current_page - 1 : (p?.current_page ?? 1));
      },
      error: (e) => {
        this.deleting.set(null);
        void this.notify.error(e);
      },
    });
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
