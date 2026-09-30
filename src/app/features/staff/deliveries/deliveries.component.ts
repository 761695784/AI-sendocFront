import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { PilotApi } from '../../../core/api/pilot.api';
import { DeliveriesSummary, NotificationDelivery } from '../../../core/api/pilot.types';
import { LaravelPage } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';

const CHANNELS: Partial<Record<string, { label: string; icon: string }>> = {
  sms: { label: 'SMS', icon: 'fa-sms' },
  email: { label: 'Email', icon: 'fa-envelope' },
  inbox: { label: 'Boîte de réception', icon: 'fa-inbox' },
};

/**
 * Suivi des envois (preuve de qui a été prévenu et quand) : SMS, emails, messages internes.
 * Un SMS en échec peut être relancé.
 */
@Component({
  selector: 'app-staff-deliveries',
  imports: [DatePipe, DecimalPipe, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Suivi des envois" subtitle="SMS, emails et messages envoyés aux citoyens et aux agents sur 30 jours" />

    @if (summary(); as s) {
      <section class="dv-grid mb-3">
        <div class="dv-tile"><span>SMS envoyés</span><strong>{{ s.sms_sent | number }}</strong></div>
        <div class="dv-tile" [class.dv-tile--alert]="s.sms_failed > 0"><span>SMS en échec</span><strong>{{ s.sms_failed | number }}</strong><small>{{ s.sms_fail_rate | number: '1.0-1' }} % des SMS</small></div>
        @for (c of channelTotals(); track c.key) {
          <div class="dv-tile"><span><i class="fas {{ c.icon }} me-1" aria-hidden="true"></i>{{ c.label }}</span><strong>{{ c.total | number }}</strong></div>
        }
      </section>
    }

    <div class="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Filtres">
      <select class="form-select form-select-sm w-auto" aria-label="Canal" [value]="channel()" (change)="channel.set($any($event.target).value); load(1)">
        <option value="">Tous les canaux</option>
        @for (c of channelKeys; track c) { <option [value]="c">{{ channels[c]?.label }}</option> }
      </select>
      <select class="form-select form-select-sm w-auto" aria-label="Statut" [value]="status()" (change)="status.set($any($event.target).value); load(1)">
        <option value="">Tous les statuts</option>
        <option value="sent">Envoyés</option>
        <option value="failed">En échec</option>
        <option value="pending">En attente</option>
        <option value="skipped">Ignorés (pas de destinataire)</option>
      </select>
    </div>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load(1)">Réessayer</button></app-error-state>
    } @else if (!page()?.data?.length) {
      <div class="dt-card"><app-empty-state icon="fa-paper-plane" title="Aucun envoi" /></div>
    } @else {
      <div class="dt-card p-0 overflow-hidden">
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead class="table-light"><tr><th>Date</th><th>Canal</th><th>Destinataire</th><th>Message</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              @for (d of page()!.data; track d.uuid) {
                <tr>
                  <td class="small text-nowrap">{{ d.created_at | date: 'd MMM, HH:mm' }}</td>
                  <td class="small text-nowrap"><i class="fas {{ channels[d.channel]?.icon ?? 'fa-paper-plane' }} me-1" aria-hidden="true"></i>{{ channels[d.channel]?.label ?? d.channel }}</td>
                  <td class="small dt-mono">{{ d.destination ?? '—' }}</td>
                  <td class="small">{{ d.preview ?? d.event }}@if (d.error) { <span class="d-block text-danger">{{ d.error }}</span> }</td>
                  <td><app-status-badge [status]="d.status" />@if (d.attempts > 1) { <small class="d-block dt-muted">{{ d.attempts }} essais</small> }</td>
                  <td class="text-end">
                    @if (d.channel === 'sms' && d.status === 'failed') {
                      <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="busy() === d.uuid" (click)="retry(d)">Relancer</button>
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
  styles: `
    .dv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .75rem; }
    .dv-tile { background: #fff; border: 1px solid #e3e8ef; border-radius: .75rem; padding: .8rem 1rem; display: flex; flex-direction: column; }
    .dv-tile span { color: #5f6b7a; font-size: .85rem; }
    .dv-tile strong { font-size: 1.6rem; color: #13294b; }
    .dv-tile small { color: #5f6b7a; }
    .dv-tile--alert { border-color: #f1b8b8; }
  `,
})
export class StaffDeliveriesComponent implements OnInit {
  private readonly api = inject(PilotApi);
  private readonly notify = inject(NotifyService);

  readonly channels = CHANNELS;
  readonly channelKeys = Object.keys(CHANNELS);
  readonly channel = signal('');
  readonly status = signal('');
  readonly page = signal<LaravelPage<NotificationDelivery> | null>(null);
  readonly summary = signal<DeliveriesSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal<string | null>(null);

  readonly channelTotals = computed(() =>
    Object.entries(this.summary()?.by_channel ?? {})
      .filter(([key]) => key !== 'sms')
      .map(([key, byStatus]) => ({
        key,
        label: CHANNELS[key]?.label ?? key,
        icon: CHANNELS[key]?.icon ?? 'fa-paper-plane',
        total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      })),
  );

  ngOnInit(): void {
    this.api.deliveriesSummary(30).subscribe({ next: (s) => this.summary.set(s), error: () => void 0 });
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.deliveries({ channel: this.channel() || undefined, status: this.status() || undefined, page }).subscribe({
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

  retry(d: NotificationDelivery): void {
    this.busy.set(d.uuid);
    this.api.retryDelivery(d.uuid).subscribe({
      next: (res) => {
        this.busy.set(null);
        if (res.status === 'sent') {
          this.notify.success('SMS renvoyé.');
        } else {
          void this.notify.error('Le SMS n’a toujours pas pu être envoyé.');
        }
        this.load(this.page()?.current_page ?? 1);
      },
      error: (e) => {
        this.busy.set(null);
        void this.notify.error(e);
      },
    });
  }
}
