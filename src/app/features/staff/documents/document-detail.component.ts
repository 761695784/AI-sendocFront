import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CounterApi } from '../../../core/api/counter.api';
import { FoundDocumentView } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';

/** Fiche d'un document trouvé : photo (privée), identité lue, garde, correspondances, restitution. */
@Component({
  selector: 'app-staff-document-detail',
  imports: [DatePipe, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><a routerLink="/espace/documents" class="btn btn-sm btn-outline-danger">Retour</a></app-error-state>
    } @else if (doc(); as d) {
      <app-page-header [title]="d.document_type.name + ' — ' + d.first_name + ' ' + d.last_name" [subtitle]="'Référence ' + d.reference">
        <a routerLink="/espace/documents" class="btn btn-outline-secondary">Retour</a>
        @if (canRestitute(d)) {
          <a [routerLink]="['restituer']" class="btn btn-dt"><i class="fas fa-handshake me-1" aria-hidden="true"></i> Restituer</a>
        }
      </app-page-header>

      <div class="row g-3">
        <div class="col-lg-5">
          <div class="dt-card">
            @if (d.image_url) {
              <img class="dt-photo" [src]="d.image_url" alt="Photo du document (usage interne)" />
              <small class="dt-muted d-block mt-1">Photo d'origine — usage interne, ne pas diffuser.</small>
            } @else {
              <p class="dt-muted mb-0">Pas de photo.</p>
            }
          </div>
        </div>
        <div class="col-lg-7">
          <section class="dt-card">
            <div class="dt-card__head">
              <h2 class="dt-card__title">Informations</h2>
              <app-status-badge [status]="d.lifecycle_status" />
            </div>
            <dl class="row small mt-2 mb-0">
              <dt class="col-5">Nom et prénom(s)</dt><dd class="col-7">{{ d.last_name }} {{ d.first_name }}</dd>
              <dt class="col-5">Date de naissance</dt><dd class="col-7">{{ d.birth_date ? (d.birth_date | date: 'd MMM y') : '—' }}</dd>
              <dt class="col-5">Numéro</dt><dd class="col-7 dt-mono">{{ d.doc_number ?? '—' }}</dd>
              <dt class="col-5">Trouvé</dt><dd class="col-7">{{ d.found_at ? (d.found_at | date: 'd MMM y') : '' }} {{ d.found_place ?? '' }}</dd>
              <dt class="col-5">Canal</dt><dd class="col-7">{{ channelLabel(d.found_channel) }}</dd>
              @if (d.custody) {
                <dt class="col-5">En garde</dt>
                <dd class="col-7">{{ d.custody.organization.name }} depuis le {{ d.custody.since | date: 'd MMM y' }}
                  @if (d.custody.deposited_by) { <small class="d-block dt-muted">Enregistré par {{ d.custody.deposited_by }}</small> }</dd>
              }
              @if (d.finder) {
                <dt class="col-5">Trouveur</dt><dd class="col-7">{{ d.finder.first_name }} {{ d.finder.last_name }} · {{ d.finder.phone_masked }}</dd>
              }
            </dl>
          </section>

          <section class="dt-card">
            <h2 class="dt-card__title mb-2">Correspondances</h2>
            @if (d.matches?.length) {
              <ul class="list-group list-group-flush">
                @for (m of d.matches; track m.uuid) {
                  <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span>Score <b>{{ m.score }}</b>/100</span>
                    <span class="d-flex gap-2 align-items-center">
                      <app-status-badge [status]="m.status" />
                      <a [routerLink]="['/espace/correspondances', m.uuid]" class="btn btn-sm btn-outline-secondary">Voir</a>
                    </span>
                  </li>
                }
              </ul>
            } @else {
              <p class="small dt-muted mb-0">Aucune déclaration correspondante pour l'instant. DocTrack continue de chercher à chaque nouvelle déclaration.</p>
            }
          </section>
        </div>
      </div>
    }
  `,
})
export class StaffDocumentDetailComponent implements OnInit {
  private readonly api = inject(CounterApi);
  private readonly session = inject(SessionStore);

  readonly uuid = input.required<string>();
  readonly doc = signal<FoundDocumentView | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.foundDocument(this.uuid()).subscribe({
      next: (d) => {
        this.doc.set(d);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Document introuvable.'));
        this.loading.set(false);
      },
    });
  }

  canRestitute(d: FoundDocumentView): boolean {
    return !!d.custody && d.lifecycle_status !== 'restituted' && this.session.can('restitutions.perform');
  }

  channelLabel(c: string): string {
    return ({ counter: 'Déposé au guichet', citizen: 'Publié par un citoyen', qr_scan: 'Signalé par QR code' } as Record<string, string>)[c] ?? c;
  }
}
