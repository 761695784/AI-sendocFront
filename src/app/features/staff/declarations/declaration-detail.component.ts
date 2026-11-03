import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CounterApi } from '../../../core/api/counter.api';
import { CounterDeclaration } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { openBlob } from '../../../shared/media/open-blob';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { ChargeActionsComponent } from '../shared/charge-actions.component';

/** Fiche d'une déclaration : pièces, certificat à imprimer, frais, annulation. */
@Component({
  selector: 'app-staff-declaration-detail',
  imports: [DatePipe, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, ErrorStateComponent, ChargeActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><a routerLink="/espace/declarations" class="btn btn-sm btn-outline-danger">Retour</a></app-error-state>
    } @else if (d(); as d) {
      <app-page-header [title]="'Déclaration ' + d.reference" [subtitle]="(d.organization?.name ?? '') + ' · ' + (d.created_at | date: 'd MMMM y, HH:mm')">
        <a routerLink="/espace/declarations" class="btn btn-outline-secondary">Retour</a>
      </app-page-header>

      <div class="row g-3">
        <div class="col-lg-7">
          <section class="dt-card">
            <div class="dt-card__head">
              <h2 class="dt-card__title">Pièces déclarées</h2>
              <app-status-badge [status]="d.status" />
            </div>
            <ul class="list-group list-group-flush mt-2">
              @for (i of d.items ?? []; track i.uuid) {
                <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                  <span>
                    <b>{{ i.document_type.name }}</b> — {{ i.first_name }} {{ i.last_name }}
                    <small class="d-block dt-muted">
                      @if (i.birth_date) { Né(e) le {{ i.birth_date | date: 'd MMM y' }} · }
                      @if (i.doc_number) { N° <span class="dt-mono">{{ i.doc_number }}</span> }
                    </small>
                  </span>
                  <app-status-badge [status]="i.status" />
                </li>
              }
            </ul>
            @if (d.lost_at || d.lost_place) {
              <p class="small mt-3 mb-0"><b>Perte :</b> {{ d.lost_at ? (d.lost_at | date: 'd MMM y') : '' }} {{ d.lost_place }} {{ d.territory?.name ? '(' + d.territory?.name + ')' : '' }}</p>
            }
            @if (d.circumstances) { <p class="small dt-muted mt-1 mb-0">{{ d.circumstances }}</p> }
          </section>

          @if (d.status === 'cancelled') {
            <div class="dt-callout dt-callout--danger"><i class="fas fa-ban" aria-hidden="true"></i><div><strong>Déclaration annulée</strong> {{ d.closure_reason }}</div></div>
          } @else if (canCancel()) {
            <button type="button" class="btn btn-sm btn-outline-danger mt-3" (click)="cancel(d)">Annuler cette déclaration</button>
          }
        </div>

        <div class="col-lg-5">
          <section class="dt-card">
            <h2 class="dt-card__title mb-2">Déclarant</h2>
            <p class="mb-0"><b>{{ d.citizen?.first_name }} {{ d.citizen?.last_name }}</b></p>
            <p class="dt-card__meta">{{ d.citizen?.phone_masked }} @if (d.recorded_by) { · enregistrée par {{ d.recorded_by.name }} }</p>
            @if (d.certified; as c) {
              <div class="dt-callout dt-callout--info mt-2 mb-0">
                <i class="fas fa-check-double" aria-hidden="true"></i>
                <div>
                  <strong>Déclarée en ligne</strong> le {{ d.created_at | date: 'd MMM y' }}
                  @if (d.receipt) { (récépissé <span class="dt-mono">{{ d.receipt.number }}</span>) }
                  , certifiée au guichet le {{ c.at | date: 'd MMM y, HH:mm' }} @if (c.by) { par {{ c.by.name }} }.
                  @if (c.person; as p) {
                    <br /><small>Personne présente : {{ p.first_name }} {{ p.last_name }}
                      @if (p.id_type) { · pièce {{ p.id_type }} @if (p.id_last4) { ••••{{ p.id_last4 }} } }</small>
                  }
                </div>
              </div>
            }
          </section>

          <section class="dt-card">
            <h2 class="dt-card__title mb-2">Certificat de perte</h2>
            @if (d.certificate; as c) {
              <p class="mb-1">N° <span class="dt-mono">{{ c.number }}</span> · {{ c.kind === 'official' ? 'certificat officiel' : 'récépissé' }}</p>
              <p class="small dt-muted">Code de vérification : <span class="dt-mono">{{ c.verification_code }}</span></p>
              @if (c.revoked_at) {
                <p class="text-danger small">Révoqué le {{ c.revoked_at | date: 'd MMM y' }}</p>
              } @else {
                <button type="button" class="btn btn-dt" [disabled]="opening()" (click)="openCertificate(d)">
                  <i class="fas fa-print me-1" aria-hidden="true"></i> {{ opening() ? 'Ouverture…' : 'Imprimer le certificat' }}
                </button>
              }
            } @else {
              <p class="small dt-muted mb-0">Le certificat sera délivré dès que le frais sera réglé.</p>
            }
          </section>

          @if (d.charge) {
            <section class="dt-card">
              <h2 class="dt-card__title mb-2">Frais</h2>
              <app-charge-actions [charge]="d.charge" (settled)="load()" />
            </section>
          }
        </div>
      </div>
    }
  `,
})
export class StaffDeclarationDetailComponent implements OnInit {
  private readonly api = inject(CounterApi);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);

  readonly uuid = input.required<string>();
  readonly d = signal<CounterDeclaration | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly opening = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.declaration(this.uuid()).subscribe({
      next: (d) => {
        this.d.set(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Déclaration introuvable.'));
        this.loading.set(false);
      },
    });
  }

  canCancel(): boolean {
    return this.session.can('declarations.cancel') || this.session.can('declarations.create');
  }

  openCertificate(d: CounterDeclaration): void {
    this.opening.set(true);
    this.api.certificatePdf(d.uuid).subscribe({
      next: (blob) => {
        this.opening.set(false);
        openBlob(blob, `${d.certificate?.number ?? d.reference}.pdf`);
      },
      error: (e) => {
        this.opening.set(false);
        void this.notify.error(e, 'Certificat indisponible');
      },
    });
  }

  async cancel(d: CounterDeclaration): Promise<void> {
    const reason = await this.notify.confirmWithNote({
      title: 'Annuler la déclaration ?',
      text: 'Le certificat sera révoqué. Un agent peut annuler sa propre saisie pendant un délai limité ; au-delà, un responsable.',
      label: 'Motif (5 caractères minimum)',
      required: true,
      confirmText: 'Annuler la déclaration',
      danger: true,
    });
    if (!reason) {
      return;
    }
    this.api.cancelDeclaration(d.uuid, reason).subscribe({
      next: (res) => {
        this.d.set(res);
        this.notify.success('Déclaration annulée.');
      },
      error: (e) => void this.notify.error(e),
    });
  }
}
