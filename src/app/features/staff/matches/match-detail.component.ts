import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CounterApi } from '../../../core/api/counter.api';
import { MatchView, ScoreCriterion } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';

const CRITERIA: Record<string, string> = {
  names: 'Noms et prénoms',
  birth_date: 'Date de naissance',
  temporal: 'Dates (perte / trouvaille)',
  location: 'Lieu',
  document_number: 'Numéro de la pièce',
};

/**
 * Comparaison côte à côte : pièce déclarée perdue / document trouvé, avec l'explication du score.
 * Le téléphone du déclarant n'est jamais affiché ici.
 */
@Component({
  selector: 'app-staff-match-detail',
  imports: [DatePipe, DecimalPipe, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><a routerLink="/espace/correspondances" class="btn btn-sm btn-outline-danger">Retour</a></app-error-state>
    } @else if (m(); as m) {
      <app-page-header [title]="'Correspondance — score ' + m.score + '/100'" [subtitle]="m.engine">
        <a routerLink="/espace/correspondances" class="btn btn-outline-secondary">Retour</a>
      </app-page-header>

      <div class="row g-3">
        <div class="col-md-6">
          <section class="dt-card h-100">
            <h2 class="dt-card__title mb-2"><i class="fas fa-file-alt me-1" aria-hidden="true"></i> Déclaré perdu</h2>
            @if (m.lost_item; as l) {
              <dl class="row small mb-0">
                <dt class="col-5">Pièce</dt><dd class="col-7">{{ l.document_type }}</dd>
                <dt class="col-5">Nom</dt><dd class="col-7"><b>{{ l.last_name }}</b></dd>
                <dt class="col-5">Prénom(s)</dt><dd class="col-7"><b>{{ l.first_name }}</b></dd>
                <dt class="col-5">Naissance</dt><dd class="col-7">{{ l.birth_date ? (l.birth_date | date: 'd MMM y') : '—' }}</dd>
                <dt class="col-5">Numéro</dt><dd class="col-7 dt-mono">{{ l.doc_number_last4 ? '••••' + l.doc_number_last4 : '—' }}</dd>
                <dt class="col-5">Perte</dt><dd class="col-7">{{ l.lost_at ? (l.lost_at | date: 'd MMM y') : '' }} {{ l.lost_place ?? '' }}</dd>
                <dt class="col-5">Déclaration</dt><dd class="col-7"><span class="dt-mono">{{ l.declaration_reference }}</span><br /><small class="dt-muted">{{ l.declaration_channel === 'counter' ? 'au guichet' : 'en ligne' }}{{ l.declared_by_structure ? ' · ' + l.declared_by_structure : '' }}</small></dd>
              </dl>
            }
          </section>
        </div>
        <div class="col-md-6">
          <section class="dt-card h-100">
            <h2 class="dt-card__title mb-2"><i class="fas fa-id-card me-1" aria-hidden="true"></i> Trouvé</h2>
            @if (m.found_document; as f) {
              <dl class="row small mb-0">
                <dt class="col-5">Pièce</dt><dd class="col-7">{{ f.document_type }}</dd>
                <dt class="col-5">Nom</dt><dd class="col-7"><b>{{ f.last_name }}</b></dd>
                <dt class="col-5">Prénom(s)</dt><dd class="col-7"><b>{{ f.first_name }}</b></dd>
                <dt class="col-5">Naissance</dt><dd class="col-7">{{ f.birth_date ? (f.birth_date | date: 'd MMM y') : '—' }}</dd>
                <dt class="col-5">Numéro</dt><dd class="col-7 dt-mono">{{ f.doc_number_last4 ? '••••' + f.doc_number_last4 : '—' }}</dd>
                <dt class="col-5">Trouvé</dt><dd class="col-7">{{ f.found_at ? (f.found_at | date: 'd MMM y') : '' }} {{ f.found_place ?? '' }}</dd>
                <dt class="col-5">Garde</dt><dd class="col-7">{{ f.custody ?? 'chez le trouveur' }}</dd>
                <dt class="col-5">Référence</dt><dd class="col-7"><a class="dt-mono" [routerLink]="['/espace/documents', f.uuid]">{{ f.reference }}</a></dd>
              </dl>
            }
          </section>
        </div>
      </div>

      <section class="dt-card">
        <h2 class="dt-card__title mb-3">Pourquoi ce score ?</h2>
        @for (c of criteria(); track c.key) {
          <div class="mb-2">
            <div class="d-flex justify-content-between small">
              <span><b>{{ c.label }}</b> — {{ c.detail.result ?? '' }}</span>
              @if (c.detail.max) { <span>{{ c.detail.points ?? 0 | number: '1.0-1' }} / {{ c.detail.max }}</span> }
            </div>
            @if (c.detail.max) {
              <div class="progress" style="height: 6px"><div class="progress-bar" [style.width.%]="(100 * (c.detail.points ?? 0)) / (c.detail.max || 1)"></div></div>
            }
          </div>
        }
      </section>

      <section class="dt-card">
        <div class="dt-card__head">
          <h2 class="dt-card__title">Décision</h2>
          <app-status-badge [status]="m.status" />
        </div>
        @if (m.reviewed_by) {
          <p class="small mt-2 mb-0">Par {{ m.reviewed_by }} le {{ m.reviewed_at | date: 'd MMM y, HH:mm' }}@if (m.review_note) { — « {{ m.review_note }} » }</p>
        }
        @if (canReview() && (m.status === 'pending_review' || m.status === 'proposed')) {
          <p class="small dt-muted mt-2">En confirmant, le propriétaire est prévenu par SMS et e-mail. En rejetant, cette paire ne sera plus proposée.</p>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-dt" [disabled]="busy()" (click)="confirm(m)"><i class="fas fa-check me-1" aria-hidden="true"></i> Confirmer</button>
            <button type="button" class="btn btn-outline-danger" [disabled]="busy()" (click)="reject(m)"><i class="fas fa-times me-1" aria-hidden="true"></i> Rejeter</button>
          </div>
        }
      </section>
    }
  `,
})
export class StaffMatchDetailComponent implements OnInit {
  private readonly api = inject(CounterApi);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);

  readonly uuid = input.required<string>();
  readonly m = signal<MatchView | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  readonly criteria = computed(() =>
    Object.entries(this.m()?.score_details ?? {}).map(([key, detail]) => ({
      key,
      label: CRITERIA[key] ?? key,
      detail: (detail ?? {}) as ScoreCriterion,
    })),
  );

  ngOnInit(): void {
    this.api.match(this.uuid()).subscribe({
      next: (m) => {
        this.m.set(m);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Correspondance introuvable.'));
        this.loading.set(false);
      },
    });
  }

  canReview(): boolean {
    return this.session.can('matches.review');
  }

  async confirm(m: MatchView): Promise<void> {
    const note = await this.notify.confirmWithNote({
      title: 'Confirmer la correspondance ?',
      text: 'Le propriétaire sera prévenu immédiatement.',
      label: 'Note (facultatif)',
      confirmText: 'Confirmer',
    });
    if (note === null) {
      return;
    }
    this.busy.set(true);
    this.api.confirmMatch(m.uuid, note).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.m.set(res);
        this.notify.success('Correspondance confirmée : le propriétaire est prévenu.');
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e);
      },
    });
  }

  async reject(m: MatchView): Promise<void> {
    const reason = await this.notify.confirmWithNote({
      title: 'Rejeter la correspondance ?',
      label: 'Motif (obligatoire, ex. date de naissance différente)',
      required: true,
      confirmText: 'Rejeter',
      danger: true,
    });
    if (!reason) {
      return;
    }
    this.busy.set(true);
    this.api.rejectMatch(m.uuid, reason).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.m.set(res);
        this.notify.success('Correspondance rejetée.');
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e);
      },
    });
  }
}
