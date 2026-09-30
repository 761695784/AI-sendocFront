import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CounterApi } from '../../../core/api/counter.api';
import { ID_TYPE_LABELS, IdType, LaravelPage, RestitutionView } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { openBlob } from '../../../shared/media/open-blob';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';

/** Registre des restitutions officielles de la structure. */
@Component({
  selector: 'app-staff-restitutions',
  imports: [DatePipe, FormsModule, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Restitutions" subtitle="Registre des remises officielles (décharges)" />
    <form class="dt-card dt-form d-flex flex-wrap gap-2 align-items-end mb-3" (ngSubmit)="load(1)">
      <div><label for="r-ref">Référence</label><input id="r-ref" name="ref" class="form-control dt-mono" [(ngModel)]="reference" placeholder="RS-2026-…" /></div>
      <button type="submit" class="btn btn-outline-secondary">Rechercher</button>
    </form>
    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load(1)">Réessayer</button></app-error-state>
    } @else if (!page()?.data?.length) {
      <div class="dt-card"><app-empty-state icon="fa-handshake" title="Aucune restitution" text="Pour restituer un document : Documents trouvés → fiche du document → Restituer." /></div>
    } @else {
      <div class="dt-card p-0 overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr><th>Décharge</th><th>Document</th><th>Remis à</th><th>Date</th><th>Statut</th></tr></thead>
            <tbody>
              @for (r of page()!.data; track r.uuid) {
                <tr [routerLink]="[r.uuid]" style="cursor: pointer">
                  <td class="dt-mono small"><a [routerLink]="[r.uuid]">{{ r.reference }}</a></td>
                  <td>{{ r.document?.document_type }}<small class="d-block dt-muted">{{ r.document?.owner_name }}</small></td>
                  <td class="small">{{ r.recipient_type === 'proxy' ? r.proxy?.name + ' (procuration)' : r.owner.name }}</td>
                  <td class="small text-nowrap">{{ r.handed_over_at | date: 'd MMM y, HH:mm' }}</td>
                  <td><app-status-badge [status]="r.status === 'completed' ? 'completed' : r.status" [label]="r.status === 'completed' ? 'Remis' : null" />
                    @if (!r.signed_scan && r.status === 'completed') { <i class="fas fa-exclamation-circle text-warning ms-1" title="Décharge signée non jointe" aria-label="Décharge signée non jointe"></i> }</td>
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
export class StaffRestitutionsListComponent implements OnInit {
  private readonly api = inject(CounterApi);
  reference = '';
  readonly page = signal<LaravelPage<RestitutionView> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.restitutions({ page, reference: this.reference.trim() }).subscribe({
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

/** Fiche d'une restitution : décharge à imprimer, décharge signée à joindre, annulation (responsable). */
@Component({
  selector: 'app-staff-restitution-detail',
  imports: [DatePipe, PercentPipe, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><a routerLink="/espace/restitutions" class="btn btn-sm btn-outline-danger">Retour</a></app-error-state>
    } @else if (r(); as r) {
      <app-page-header [title]="'Restitution ' + r.reference" [subtitle]="r.organization.name + ' · ' + (r.handed_over_at | date: 'd MMMM y, HH:mm')">
        <a routerLink="/espace/restitutions" class="btn btn-outline-secondary">Retour</a>
        <button type="button" class="btn btn-dt" (click)="print(r)"><i class="fas fa-print me-1" aria-hidden="true"></i> Décharge</button>
      </app-page-header>

      @if (r.status === 'voided') {
        <div class="dt-callout dt-callout--danger mt-0 mb-3"><i class="fas fa-ban" aria-hidden="true"></i><div><strong>Restitution annulée.</strong> Le document est revenu sous la garde de la structure.</div></div>
      }

      <div class="row g-3">
        <div class="col-lg-7">
          <section class="dt-card">
            <div class="dt-card__head"><h2 class="dt-card__title">Remise</h2><app-status-badge [status]="r.status" [label]="r.status === 'completed' ? 'Remis' : null" /></div>
            <dl class="row small mt-2 mb-0">
              <dt class="col-5">Document</dt><dd class="col-7">{{ r.document?.document_type }} — <a [routerLink]="['/espace/documents', r.document?.uuid]" class="dt-mono">{{ r.document?.reference }}</a></dd>
              <dt class="col-5">Titulaire</dt><dd class="col-7">{{ r.owner.name }}@if (r.owner.id_type) { <small class="d-block dt-muted">{{ idLabel(r.owner.id_type) }} ••••{{ r.owner.id_last4 }}</small> }</dd>
              @if (r.proxy; as p) {
                <dt class="col-5">Mandataire</dt><dd class="col-7">{{ p.name }}{{ p.relationship ? ' (' + p.relationship + ')' : '' }}<small class="d-block dt-muted">{{ idLabel(p.id_type) }} ••••{{ p.id_last4 }}@if (p.power_of_attorney_ref) { · procuration {{ p.power_of_attorney_ref }} }</small></dd>
              }
              <dt class="col-5">Agent</dt><dd class="col-7">{{ r.agent }}</dd>
              @if (r.name_similarity !== null) {
                <dt class="col-5">Concordance des noms</dt><dd class="col-7">{{ r.name_similarity | percent: '1.0-0' }}@if (r.name_override) { <small class="d-block text-warning-emphasis">Dérogation : {{ r.name_override }}</small> }</dd>
              }
              <dt class="col-5">Vérification</dt><dd class="col-7 dt-mono">{{ r.verification_code }}</dd>
            </dl>
          </section>
        </div>
        <div class="col-lg-5">
          <section class="dt-card">
            <h2 class="dt-card__title mb-2">Décharge signée</h2>
            @if (r.signed_scan) {
              <p class="text-success mb-2"><i class="fas fa-check me-1" aria-hidden="true"></i> Jointe au dossier.</p>
            } @else {
              <p class="small text-warning-emphasis">À joindre : photo ou scan de la décharge signée.</p>
            }
            @if (r.status === 'completed' && canPerform()) {
              <label class="btn btn-sm btn-outline-secondary mb-0" [class.disabled]="busy()">
                <i class="fas fa-paperclip me-1" aria-hidden="true"></i> {{ r.signed_scan ? 'Remplacer' : 'Joindre' }}
                <input type="file" accept="image/*,application/pdf" capture="environment" hidden (change)="upload($event, r)" />
              </label>
            }
          </section>
          @if (r.status === 'completed' && canVoid()) {
            <section class="dt-card">
              <h2 class="dt-card__title mb-2">Erreur de remise ?</h2>
              <p class="small dt-muted">Annulation possible par un responsable dans le délai prévu (72 h).</p>
              <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="busy()" (click)="cancelRestitution(r)">Annuler la restitution</button>
            </section>
          }
        </div>
      </div>
    }
  `,
})
export class StaffRestitutionDetailComponent implements OnInit {
  private readonly api = inject(CounterApi);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);

  readonly uuid = input.required<string>();
  readonly r = signal<RestitutionView | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  ngOnInit(): void {
    this.api.restitution(this.uuid()).subscribe({
      next: (r) => {
        this.r.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Restitution introuvable.'));
        this.loading.set(false);
      },
    });
  }

  idLabel(t: string | null): string {
    return t ? (ID_TYPE_LABELS[t as IdType] ?? t) : '';
  }

  canPerform(): boolean {
    return this.session.can('restitutions.perform');
  }

  canVoid(): boolean {
    return this.session.can('restitutions.void');
  }

  print(r: RestitutionView): void {
    this.api.dischargePdf(r.uuid).subscribe({
      next: (blob) => openBlob(blob, `${r.reference}.pdf`),
      error: (e) => void this.notify.error(e, 'Décharge indisponible'),
    });
  }

  upload(event: Event, r: RestitutionView): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.busy.set(true);
    this.api.attachSignedScan(r.uuid, file, file.name).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.r.set(res);
        this.notify.success('Décharge signée enregistrée.');
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e);
      },
    });
  }

  async cancelRestitution(r: RestitutionView): Promise<void> {
    const reason = await this.notify.confirmWithNote({
      title: 'Annuler cette restitution ?',
      text: 'Le document redevient « en garde ». Le motif est conservé et le propriétaire est prévenu.',
      label: 'Motif (5 caractères minimum)',
      required: true,
      confirmText: 'Annuler la restitution',
      danger: true,
    });
    if (!reason) {
      return;
    }
    this.busy.set(true);
    this.api.voidRestitution(r.uuid, reason).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.r.set(res);
        this.notify.success('Restitution annulée.');
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e);
      },
    });
  }
}
