import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CounterApi } from '../../../core/api/counter.api';
import { LaravelPage, MatchView } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';

const TABS = [
  { status: 'pending_review', label: 'À examiner' },
  { status: 'confirmed', label: 'Confirmées' },
  { status: 'rejected', label: 'Rejetées' },
];

/** File des correspondances proposées par le moteur, meilleur score d'abord. */
@Component({
  selector: 'app-staff-matches',
  imports: [DatePipe, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Correspondances" subtitle="Document trouvé ↔ déclaration de perte : à confirmer ou rejeter" />

    <ul class="nav nav-pills mb-3">
      @for (t of tabs; track t.status) {
        <li class="nav-item"><button type="button" class="nav-link" [class.active]="status() === t.status" (click)="select(t.status)">{{ t.label }}</button></li>
      }
    </ul>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load(1)">Réessayer</button></app-error-state>
    } @else if (!page()?.data?.length) {
      <div class="dt-card"><app-empty-state icon="fa-link" title="Rien à examiner" text="Les correspondances probables (score élevé sans numéro identique) arrivent ici pour vérification." /></div>
    } @else {
      <div class="dt-grid">
        @for (m of page()!.data; track m.uuid) {
          <a class="dt-card m-0 text-reset text-decoration-none" [routerLink]="[m.uuid]">
            <div class="dt-card__head">
              <span class="score" [class.score--high]="m.score >= 90" [class.score--mid]="m.score >= 75 && m.score < 90">{{ m.score }}</span>
              <app-status-badge [status]="m.status" />
            </div>
            <p class="mt-2 mb-1"><b>{{ m.found_document?.document_type }}</b></p>
            <p class="small mb-1"><span class="dt-muted">Trouvé :</span> {{ m.found_document?.last_name }} {{ m.found_document?.first_name }}</p>
            <p class="small mb-1"><span class="dt-muted">Déclaré :</span> {{ m.lost_item?.last_name }} {{ m.lost_item?.first_name }}</p>
            <p class="small dt-muted mb-0">{{ m.number_match ? 'Numéro identique · ' : '' }}{{ m.created_at | date: 'd MMM, HH:mm' }}</p>
          </a>
        }
      </div>
      <app-paginator [page]="page()" (pageChange)="load($event)" />
    }
  `,
  styles: `
    .score { display: inline-grid; place-items: center; width: 2.6rem; height: 2.6rem; border-radius: 50%; font-weight: 700; background: #eef0f3; color: #4a5361; }
    .score--mid { background: #fff3dc; color: #8a5a00; }
    .score--high { background: #e3f4ea; color: #1e7044; }
  `,
})
export class StaffMatchesListComponent implements OnInit {
  private readonly api = inject(CounterApi);
  readonly tabs = TABS;
  readonly status = signal('pending_review');
  readonly page = signal<LaravelPage<MatchView> | null>(null);
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
    this.api.matches(this.status(), page).subscribe({
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
