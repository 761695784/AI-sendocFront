import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CitizenApi } from '../../../core/api/citizen.api';
import { ChargeView } from '../../../core/api/citizen.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';

/**
 * Frais du citoyen (certificat au guichet, renouvellement de QR…) et paiement par Wave.
 * Pendant la phase pilote, tout est gratuit (statut « Gratuit (pilote) »).
 */
@Component({
  selector: 'app-my-payments',
  imports: [DatePipe, DecimalPipe, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dt-toolbar"><h2>Mes paiements</h2></div>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!">
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">Réessayer</button>
      </app-error-state>
    } @else if (charges().length === 0) {
      <div class="dt-card">
        <app-empty-state icon="fa-wallet" title="Aucun frais"
          text="Les démarches payantes (certificat de perte au guichet, renouvellement de QR code) apparaîtront ici." />
      </div>
    } @else {
      <div class="dt-card p-0 overflow-hidden">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr><th>Démarche</th><th>Référence</th><th class="text-end">Montant</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              @for (c of charges(); track c.uuid) {
                <tr>
                  <td>
                    <b>{{ c.service.name ?? c.service.code }}</b>
                    <div class="dt-muted small">{{ c.created_at | date: 'd MMM y' }}@if (c.organization) { · {{ c.organization.name }} }</div>
                  </td>
                  <td class="dt-mono small">{{ c.reference }}</td>
                  <td class="text-end text-nowrap">
                    @if (c.status === 'waived_pilot') {
                      <s class="dt-muted">{{ c.list_amount | number: '1.0-0' }} {{ c.currency }}</s>
                    } @else {
                      {{ c.amount | number: '1.0-0' }} {{ c.currency }}
                    }
                  </td>
                  <td><app-status-badge [status]="c.status" /></td>
                  <td class="text-end">
                    @if (c.status === 'pending') {
                      <button type="button" class="btn btn-sm btn-dt-gold text-nowrap" [disabled]="busy() === c.uuid" (click)="pay(c)">
                        {{ busy() === c.uuid ? 'Ouverture…' : 'Payer avec Wave' }}
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      <p class="dt-muted small mt-2">Le paiement est confirmé par Wave directement à DocTrack ; le reçu vous est envoyé par SMS.</p>
    }
  `,
})
export class MyPaymentsComponent implements OnInit {
  private readonly api = inject(CitizenApi);
  private readonly notify = inject(NotifyService);

  readonly charges = signal<ChargeView[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.myCharges().subscribe({
      next: (list) => {
        this.charges.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Impossible de charger vos paiements.'));
        this.loading.set(false);
      },
    });
  }

  /** Ouvre la page de paiement Wave ; le retour se fait sur /paiement/succes ou /paiement/echec. */
  pay(c: ChargeView): void {
    this.busy.set(c.uuid);
    this.api.checkout(c.uuid).subscribe({
      next: (res) => {
        window.location.href = res.checkout_url;
      },
      error: (e) => {
        this.busy.set(null);
        void this.notify.error(e, 'Paiement indisponible');
      },
    });
  }
}
