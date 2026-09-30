import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CounterApi } from '../../../core/api/counter.api';
import { ChargeShortView, CounterCharge } from '../../../core/api/counter.types';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';

/**
 * Règlement d'un frais au guichet : espèces (avec calcul de la monnaie), Wave (lien de paiement),
 * exonération motivée (responsable). En phase pilote, le frais est « Gratuit (pilote) » : rien à faire.
 */
@Component({
  selector: 'app-charge-actions',
  imports: [DecimalPipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (charge(); as c) {
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="dt-mono small">{{ c.reference }}</span>
        <app-status-badge [status]="c.status" />
        <b>
          @if (c.status === 'waived_pilot') {
            <s class="dt-muted fw-normal">{{ c.list_amount | number: '1.0-0' }} {{ c.currency }}</s> gratuit pendant le pilote
          } @else {
            {{ c.amount | number: '1.0-0' }} {{ c.currency }}
          }
        </b>
      </div>
      @if (c.status === 'pending') {
        <div class="d-flex flex-wrap gap-2 mt-2">
          @if (canCollect()) {
            <button type="button" class="btn btn-sm btn-dt" [disabled]="busy()" (click)="cash(c)"><i class="fas fa-money-bill-wave me-1" aria-hidden="true"></i> Encaisser en espèces</button>
            <button type="button" class="btn btn-sm btn-dt-gold" [disabled]="busy()" (click)="wave(c)">Payer avec Wave</button>
          }
          @if (canExempt()) {
            <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="busy()" (click)="exempt(c)">Exonérer</button>
          }
        </div>
        @if (waveUrl()) {
          <div class="dt-callout dt-callout--info">
            <i class="fas fa-mobile-alt" aria-hidden="true"></i>
            <div>
              <strong>Lien de paiement Wave</strong>
              Le citoyen ouvre ce lien sur son téléphone (le SMS lui a aussi été envoyé s'il a un numéro) :
              <a [href]="waveUrl()" target="_blank" rel="noopener" class="d-block text-break">{{ waveUrl() }}</a>
              Le paiement est confirmé automatiquement ; actualisez la page ensuite.
            </div>
          </div>
        }
      }
    }
  `,
})
export class ChargeActionsComponent {
  private readonly api = inject(CounterApi);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);

  readonly charge = input<ChargeShortView | CounterCharge | null | undefined>(null);
  /** Émis après un règlement : l'écran recharge ses données. */
  readonly settled = output<CounterCharge>();

  readonly busy = signal(false);
  readonly waveUrl = signal<string | null>(null);

  canCollect(): boolean {
    return this.session.can('billing.collect');
  }

  canExempt(): boolean {
    return this.session.can('billing.exempt');
  }

  async cash(c: ChargeShortView): Promise<void> {
    const received = await this.notify.prompt({
      title: `Encaisser ${c.amount} ${c.currency}`,
      label: 'Montant reçu (pour calculer la monnaie)',
      input: 'number',
      value: String(c.amount),
      confirmText: 'Encaisser',
    });
    if (received === null) {
      return;
    }
    this.busy.set(true);
    this.api.payCash(c.uuid, received ? Number(received) : null).subscribe({
      next: (res) => {
        this.busy.set(false);
        const change = res.change_due ?? 0;
        void this.notify.info(change > 0 ? `Monnaie à rendre : ${change} ${res.currency}.` : 'Paiement enregistré. Le reçu est envoyé par SMS.', 'Paiement enregistré');
        this.settled.emit(res);
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e);
      },
    });
  }

  async wave(c: ChargeShortView): Promise<void> {
    const phone = await this.notify.prompt({
      title: 'Paiement Wave',
      label: 'Numéro Wave du citoyen (facultatif)',
      input: 'tel',
      placeholder: '77 123 45 67',
      confirmText: 'Créer le lien',
    });
    if (phone === null) {
      return;
    }
    this.busy.set(true);
    this.api.waveCheckout(c.uuid, phone || null).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.waveUrl.set(res.checkout_url);
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e, 'Wave indisponible');
      },
    });
  }

  async exempt(c: ChargeShortView): Promise<void> {
    const reason = await this.notify.confirmWithNote({
      title: 'Exonérer ce frais ?',
      text: 'Ex. : indigence, victime d’agression, réquisition. Le motif est enregistré.',
      label: 'Motif (obligatoire)',
      required: true,
      confirmText: 'Exonérer',
    });
    if (!reason) {
      return;
    }
    this.busy.set(true);
    this.api.exemptCharge(c.uuid, reason).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.notify.success('Frais exonéré.');
        this.settled.emit(res);
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e);
      },
    });
  }
}
