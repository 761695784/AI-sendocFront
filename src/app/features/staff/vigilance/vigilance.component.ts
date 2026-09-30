import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PilotApi } from '../../../core/api/pilot.api';
import { ALERT_LEVELS, AlertLevel, AlertStatus, VigilanceAlert, VigilanceList } from '../../../core/api/pilot.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';

/** Fiche liée à l'alerte (document trouvé, déclaration…) dans l'espace structure. */
export function alertSubjectRoute(a: Pick<VigilanceAlert, 'subject'>): string[] | null {
  const uuid = a.subject?.uuid;
  if (!uuid) {
    return null;
  }
  switch (a.subject.type) {
    case 'Document':
      return ['/espace/documents', uuid];
    case 'DeclarationDePerte':
    case 'Declaration':
      return ['/espace/declarations', uuid];
    case 'Restitution':
      return ['/espace/restitutions', uuid];
    default:
      return null;
  }
}

/** Libellés des informations complémentaires d'une alerte. */
const DETAIL_LABELS: Record<string, string> = {
  reason: 'Motif',
  other_reference: 'Autre document',
  other: 'Autre déclaration',
  count: 'Nombre',
  days: 'Sur (jours)',
  identities: 'Identités différentes',
  issues: 'Points relevés',
  number_changed: 'Numéro corrigé après lecture',
  ocr_scan: 'Lecture de la pièce',
  role: 'Rôle',
};

export function alertDetails(details: Record<string, unknown>): { label: string; value: string }[] {
  return Object.entries(details ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ({
      label: DETAIL_LABELS[k] ?? k.replace(/_/g, ' '),
      value: Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'oui' : 'non') : String(v),
    }));
}

const LEVEL_TONE: Record<AlertLevel, string> = { high: 'danger', warning: 'warning', info: 'info' };

/** Boutons « Confirmer » / « Écarter » avec motif écrit (partagés par la liste et la fiche). */
async function askDecision(notify: NotifyService, decision: 'confirm' | 'dismiss'): Promise<string | null> {
  return notify.confirmWithNote(
    decision === 'confirm'
      ? {
          title: 'Confirmer l’alerte ?',
          text: 'Le doublon ou la fraude est avéré(e). L’alerte reste dans l’historique avec votre motif.',
          label: 'Ce que vous avez vérifié (obligatoire)',
          required: true,
          confirmText: 'Confirmer l’alerte',
          danger: true,
        }
      : {
          title: 'Écarter l’alerte ?',
          text: 'Fausse alerte : rien d’anormal après vérification.',
          label: 'Ce que vous avez vérifié (obligatoire)',
          required: true,
          confirmText: 'Écarter',
        },
  );
}

/**
 * Alertes de vigilance (doublons, signes de fraude) du périmètre : à relire puis confirmer ou écarter.
 * Une alerte n'est jamais une sanction ; seule une alerte HAUTE ouverte bloque la restitution sans dérogation.
 */
@Component({
  selector: 'app-staff-vigilance',
  imports: [DatePipe, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Vigilance" subtitle="Doublons et signes de fraude repérés automatiquement : à vérifier, puis confirmer ou écarter" />

    <div class="d-flex flex-wrap gap-3 align-items-center mb-3">
      <ul class="nav nav-pills">
        @for (t of tabs; track t.status) {
          <li class="nav-item"><button type="button" class="nav-link" [class.active]="status() === t.status" (click)="setStatus(t.status)">{{ t.label }}</button></li>
        }
      </ul>
      <div class="d-flex flex-wrap gap-2 ms-lg-auto" role="group" aria-label="Filtrer par niveau">
        <button type="button" class="btn btn-sm" [class.btn-dt]="!level()" [class.btn-outline-secondary]="!!level()" (click)="setLevel(null)">Tous niveaux</button>
        @for (l of levelKeys; track l) {
          <button type="button" class="btn btn-sm" [class.btn-dt]="level() === l" [class.btn-outline-secondary]="level() !== l" (click)="setLevel(l)">
            <i class="fas {{ levels[l].icon }} me-1" aria-hidden="true"></i>{{ levels[l].label }}
            @if (summary()[l]) { <span class="badge ms-1" [class]="'text-bg-' + tone(l)">{{ summary()[l] }}</span> }
          </button>
        }
      </div>
    </div>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load(1)">Réessayer</button></app-error-state>
    } @else if (!list()?.data?.length) {
      <div class="dt-card"><app-empty-state icon="fa-shield-alt" [title]="status() === 'open' ? 'Aucune alerte à traiter' : 'Aucune alerte'" text="Les doublons (même numéro, même photo) et les incohérences de lecture des pièces apparaissent ici." /></div>
    } @else {
      <div class="vg-list">
        @for (a of list()!.data; track a.uuid) {
          <article class="dt-card vg-item" [class]="'vg-item--' + a.level">
            <div class="vg-item__head">
              <span class="badge" [class]="'text-bg-' + tone(a.level)"><i class="fas {{ levels[a.level].icon }} me-1" aria-hidden="true"></i>{{ levels[a.level].label }}</span>
              <a class="vg-item__title" [routerLink]="[a.uuid]">{{ a.label }}</a>
              @if (a.status !== 'open') { <app-status-badge [status]="a.status" /> }
              <small class="dt-muted ms-auto text-nowrap">{{ a.created_at | date: 'd MMM y, HH:mm' }}</small>
            </div>
            @if (a.message) { <p class="mb-1 mt-2">{{ a.message }}</p> }
            <p class="small dt-muted mb-0">
              @if (subjectRoute(a); as r) { <a [routerLink]="r">{{ a.subject.reference ?? 'Voir la fiche' }}</a> } @else if (a.subject.reference) { {{ a.subject.reference }} }
              @if (a.organization) { · {{ a.organization.name }} }
              @if (a.reviewed_by) { · traitée par {{ a.reviewed_by }} le {{ a.reviewed_at | date: 'd MMM y' }} }
            </p>
            @if (a.review_note) { <p class="small mb-0 mt-1"><i class="fas fa-comment-alt me-1 dt-muted" aria-hidden="true"></i>{{ a.review_note }}</p> }
            @if (a.status === 'open' && canReview()) {
              <div class="d-flex gap-2 mt-2">
                <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="busy() === a.uuid" (click)="decide(a, 'confirm')">Confirmer</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="busy() === a.uuid" (click)="decide(a, 'dismiss')">Écarter</button>
              </div>
            }
          </article>
        }
      </div>
      <app-paginator [page]="list()!.meta" (pageChange)="load($event)" />
    }
  `,
  styles: `
    .vg-list { display: flex; flex-direction: column; gap: .75rem; }
    .vg-item { margin: 0; border-left: 4px solid #9aa5b1; }
    .vg-item--high { border-left-color: #b3261e; }
    .vg-item--warning { border-left-color: #d98e04; }
    .vg-item--info { border-left-color: #1d5b99; }
    .vg-item__head { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
    .vg-item__title { font-weight: 600; color: #13294b; }
  `,
})
export class StaffVigilanceComponent implements OnInit {
  private readonly api = inject(PilotApi);
  private readonly notify = inject(NotifyService);
  private readonly session = inject(SessionStore);

  readonly tabs: { status: AlertStatus; label: string }[] = [
    { status: 'open', label: 'À traiter' },
    { status: 'confirmed', label: 'Confirmées' },
    { status: 'dismissed', label: 'Écartées' },
  ];
  readonly levels = ALERT_LEVELS;
  readonly levelKeys: AlertLevel[] = ['high', 'warning', 'info'];

  readonly status = signal<AlertStatus>('open');
  readonly level = signal<AlertLevel | null>(null);
  readonly list = signal<VigilanceList | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal<string | null>(null);

  readonly summary = computed(() => this.list()?.summary ?? {});
  readonly canReview = computed(() => {
    this.session.abilities();
    return this.session.can('vigilance.review');
  });

  ngOnInit(): void {
    this.load(1);
  }

  tone(level: AlertLevel): string {
    return LEVEL_TONE[level];
  }

  subjectRoute(a: VigilanceAlert): string[] | null {
    return alertSubjectRoute(a);
  }

  setStatus(status: AlertStatus): void {
    this.status.set(status);
    this.load(1);
  }

  setLevel(level: AlertLevel | null): void {
    this.level.set(level);
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.alerts({ status: this.status(), level: this.level() ?? undefined, page }).subscribe({
      next: (l) => {
        this.list.set(l);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  async decide(a: VigilanceAlert, decision: 'confirm' | 'dismiss'): Promise<void> {
    const note = await askDecision(this.notify, decision);
    if (note === null) {
      return;
    }
    if (note.length < 5) {
      void this.notify.error('Le motif doit contenir au moins 5 caractères.');
      return;
    }
    this.busy.set(a.uuid);
    this.api.decideAlert(a.uuid, decision, note).subscribe({
      next: () => {
        this.busy.set(null);
        this.notify.success(decision === 'confirm' ? 'Alerte confirmée.' : 'Alerte écartée.');
        this.load(this.list()?.meta.current_page ?? 1);
      },
      error: (e) => {
        this.busy.set(null);
        void this.notify.error(e);
      },
    });
  }
}

/** Fiche d'une alerte de vigilance. */
@Component({
  selector: 'app-staff-vigilance-detail',
  imports: [DatePipe, LowerCasePipe, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><a routerLink="/espace/vigilance" class="btn btn-sm btn-outline-danger">Retour</a></app-error-state>
    } @else if (alert(); as a) {
      <app-page-header [title]="a.label" [subtitle]="'Signalée le ' + (a.created_at | date: 'd MMMM y à HH:mm')">
        <a routerLink="/espace/vigilance" class="btn btn-outline-secondary">Retour</a>
      </app-page-header>
      <div class="row g-3">
        <div class="col-lg-7">
          <section class="dt-card">
            <div class="dt-card__head">
              <span class="badge" [class]="'text-bg-' + tone(a.level)"><i class="fas {{ levels[a.level].icon }} me-1" aria-hidden="true"></i>Niveau {{ levels[a.level].label | lowercase }}</span>
              <app-status-badge [status]="a.status" />
            </div>
            @if (a.message) { <p class="mt-3">{{ a.message }}</p> }
            @if (details().length) {
              <dl class="row small mb-0">
                @for (d of details(); track d.label) { <dt class="col-sm-4 dt-muted fw-normal">{{ d.label }}</dt><dd class="col-sm-8">{{ d.value }}</dd> }
              </dl>
            }
            @if (a.level === 'high' && a.status === 'open') {
              <div class="dt-callout dt-callout--danger"><i class="fas fa-lock" aria-hidden="true"></i>
                <div>Tant que cette alerte est ouverte, la restitution du document demande l'accord motivé d'un responsable.</div></div>
            }
          </section>
        </div>
        <div class="col-lg-5">
          <section class="dt-card">
            <h2 class="dt-card__title mb-2">Concerne</h2>
            <p class="mb-1">
              @if (subjectRoute(); as r) { <a [routerLink]="r">{{ a.subject.reference ?? 'Ouvrir la fiche' }}</a> } @else { {{ a.subject.reference ?? subjectLabel(a.subject.type) }} }
            </p>
            <p class="small dt-muted mb-0">{{ subjectLabel(a.subject.type) }}@if (a.organization) { · {{ a.organization.name }} }</p>
          </section>
          <section class="dt-card">
            <h2 class="dt-card__title mb-2">Décision</h2>
            @if (a.status === 'open') {
              @if (canReview()) {
                <p class="small dt-muted">Vérifiez les deux fiches (photo, numéro, titulaire), puis tranchez. Votre motif est conservé.</p>
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-outline-danger" [disabled]="busy()" (click)="decide('confirm')">Confirmer</button>
                  <button type="button" class="btn btn-outline-secondary" [disabled]="busy()" (click)="decide('dismiss')">Écarter</button>
                </div>
              } @else {
                <p class="small dt-muted mb-0">Un responsable doit examiner cette alerte.</p>
              }
            } @else {
              <p class="mb-1">{{ a.status === 'confirmed' ? 'Confirmée' : 'Écartée' }} par <b>{{ a.reviewed_by }}</b> le {{ a.reviewed_at | date: 'd MMM y, HH:mm' }}</p>
              @if (a.review_note) { <p class="small mb-0"><i class="fas fa-comment-alt me-1 dt-muted" aria-hidden="true"></i>{{ a.review_note }}</p> }
            }
          </section>
        </div>
      </div>
    }
  `,
})
export class StaffVigilanceDetailComponent implements OnInit {
  private readonly api = inject(PilotApi);
  private readonly notify = inject(NotifyService);
  private readonly session = inject(SessionStore);

  readonly uuid = input.required<string>();
  readonly levels = ALERT_LEVELS;
  readonly alert = signal<VigilanceAlert | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  readonly details = computed(() => alertDetails(this.alert()?.details ?? {}));
  readonly subjectRoute = computed(() => (this.alert() ? alertSubjectRoute(this.alert()!) : null));
  readonly canReview = computed(() => {
    this.session.abilities();
    return this.session.can('vigilance.review');
  });

  ngOnInit(): void {
    this.api.alert(this.uuid()).subscribe({
      next: (a) => {
        this.alert.set(a);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Alerte introuvable.'));
        this.loading.set(false);
      },
    });
  }

  tone(level: AlertLevel): string {
    return LEVEL_TONE[level];
  }

  subjectLabel(type: string): string {
    return ({ Document: 'Document trouvé', DeclarationDePerte: 'Déclaration de perte', User: 'Compte utilisateur', Restitution: 'Restitution' } as Record<string, string>)[type] ?? type;
  }

  async decide(decision: 'confirm' | 'dismiss'): Promise<void> {
    const note = await askDecision(this.notify, decision);
    if (note === null) {
      return;
    }
    if (note.length < 5) {
      void this.notify.error('Le motif doit contenir au moins 5 caractères.');
      return;
    }
    this.busy.set(true);
    this.api.decideAlert(this.uuid(), decision, note).subscribe({
      next: (a) => {
        this.busy.set(false);
        this.alert.set(a);
        this.notify.success(decision === 'confirm' ? 'Alerte confirmée.' : 'Alerte écartée.');
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e);
      },
    });
  }
}
