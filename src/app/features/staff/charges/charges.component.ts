import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CounterApi } from '../../../core/api/counter.api';
import { CounterCharge, LaravelPage } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';
import { ChargeActionsComponent } from '../shared/charge-actions.component';

const TABS = [
  { status: 'pending', label: 'À encaisser' },
  { status: '', label: 'Tous' },
];

/** Frais de la structure : encaissement (espèces, Wave), exonération. Gratuit pendant le pilote. */
@Component({
  selector: 'app-staff-charges',
  imports: [DatePipe, PageHeaderComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent, ChargeActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Frais" subtitle="Certificats au guichet, renouvellements de QR code" />
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
      <div class="dt-card"><app-empty-state icon="fa-coins" title="Aucun frais" [text]="status() === 'pending' ? 'Rien à encaisser. Pendant la phase pilote, les démarches sont gratuites.' : null" /></div>
    } @else {
      @for (c of page()!.data; track c.uuid) {
        <article class="dt-card">
          <div class="dt-card__head">
            <div>
              <h3 class="dt-card__title">{{ c.service.name ?? c.service.code }}</h3>
              <p class="dt-card__meta">{{ c.created_at | date: 'd MMM y, HH:mm' }}@if (c.paid_with) { · payé par {{ c.paid_with === 'cash' ? 'espèces' : 'Wave' }} }@if (c.exemption_reason) { · exonéré : {{ c.exemption_reason }} }</p>
            </div>
          </div>
          <div class="mt-2"><app-charge-actions [charge]="c" (settled)="load(currentPage)" /></div>
        </article>
      }
      <app-paginator [page]="page()" (pageChange)="load($event)" />
    }
  `,
})
export class StaffChargesComponent implements OnInit {
  private readonly api = inject(CounterApi);
  readonly tabs = TABS;
  readonly status = signal('pending');
  readonly page = signal<LaravelPage<CounterCharge> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  currentPage = 1;

  ngOnInit(): void {
    this.load(1);
  }

  select(status: string): void {
    this.status.set(status);
    this.load(1);
  }

  load(page: number): void {
    this.currentPage = page;
    this.loading.set(true);
    this.error.set(null);
    this.api.charges(this.status() || undefined, page).subscribe({
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
