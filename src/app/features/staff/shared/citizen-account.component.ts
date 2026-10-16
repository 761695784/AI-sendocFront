import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CounterApi } from '../../../core/api/counter.api';
import { CitizenProfile } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';

/**
 * Compte DocTrack de la personne reçue au guichet :
 *  - pas de compte → saisir son email pour le créer (elle reçoit un lien pour choisir son mot de passe) ;
 *  - compte en attente → renvoyer le lien ;
 *  - compte actif → ses déclarations apparaissent dans son espace.
 */
@Component({
  selector: 'app-citizen-account',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (status()) {
      @case ('active') {
        <div class="ca ca--ok"><i class="fas fa-user-check" aria-hidden="true"></i>
          <span><strong>Compte DocTrack actif.</strong> La déclaration apparaîtra dans son espace personnel.</span></div>
      }
      @case ('pending') {
        <div class="ca ca--wait"><i class="fas fa-envelope-open-text" aria-hidden="true"></i>
          <span><strong>Compte créé, en attente d'activation.</strong> Un lien pour choisir son mot de passe a été envoyé
            @if (citizen().email_masked) { à {{ citizen().email_masked }} }.</span>
          <button type="button" class="btn btn-sm btn-outline-secondary ms-auto" [disabled]="busy()" (click)="submit()">Renvoyer le lien</button>
        </div>
      }
      @default {
        <form class="ca ca--none" (ngSubmit)="submit()">
          <i class="fas fa-user-plus" aria-hidden="true"></i>
          <div class="ca__body">
            <strong>Pas encore de compte DocTrack.</strong>
            <small class="d-block dt-muted">Avec son email, la personne reçoit un lien pour choisir son mot de passe et suit ses déclarations en ligne.
              Sans email, ses déclarations seront rattachées à son compte s'il s'inscrit plus tard avec ce téléphone.</small>
            <div class="d-flex flex-wrap gap-2 mt-2">
              <label for="ca-email" class="visually-hidden">Email de la personne</label>
              <input id="ca-email" name="email" type="email" class="form-control form-control-sm ca__input" placeholder="email@exemple.sn" [(ngModel)]="email" />
              <button type="submit" class="btn btn-sm btn-dt" [disabled]="busy() || !email.trim()">{{ busy() ? 'Création…' : 'Créer son compte' }}</button>
            </div>
            @if (error()) { <small class="dt-error">{{ error() }}</small> }
          </div>
        </form>
      }
    }
  `,
  styles: `
    .ca { display: flex; flex-wrap: wrap; align-items: flex-start; gap: .75rem; margin-top: .85rem; padding: .75rem .9rem; border-radius: 12px; font-size: .9rem; }
    .ca > i { margin-top: .2rem; font-size: 1.05rem; }
    .ca--ok { background: #e8f5e9; color: #1e6b2c; }
    .ca--wait { background: #fff8e8; color: #7a5000; align-items: center; }
    .ca--none { background: var(--bo-soft, #eef1f6); color: var(--bo-ink, #1c2430); }
    .ca__body { flex: 1; min-width: 0; }
    .ca__input { max-width: 280px; }
  `,
})
export class CitizenAccountComponent {
  private readonly api = inject(CounterApi);
  private readonly notify = inject(NotifyService);

  readonly citizen = input.required<CitizenProfile>();
  readonly updated = output<CitizenProfile>();

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly status = computed(() => this.citizen().account_status ?? (this.citizen().has_account ? 'active' : 'none'));
  email = '';

  submit(): void {
    const pending = this.status() === 'pending';
    this.busy.set(true);
    this.error.set(null);
    this.api.citizenAccount(this.citizen().uuid, pending ? null : this.email.trim()).subscribe({
      next: (c) => {
        this.busy.set(false);
        this.notify.success(pending ? 'Lien d’activation renvoyé.' : 'Compte créé : un lien d’activation a été envoyé par email.');
        this.updated.emit(c);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(e));
      },
    });
  }
}
