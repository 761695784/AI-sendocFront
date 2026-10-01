import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PilotApi } from '../../../core/api/pilot.api';
import { ActivityReport } from '../../../core/api/pilot.types';
import { LaravelPage } from '../../../core/api/counter.types';
import { apiErrorMessage, saveBlob } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';
import { isoDate } from '../stats/stats.component';
import { spaceBase } from '../shared/space-base';
import { NarrativeReviewComponent } from '../../admin/narrative-review/narrative-review.component';

/** Niveau global d'un rapport → couleur de statut + icône (jamais la couleur seule). */
export function reportLevel(level: string | null | undefined): { tone: string; icon: string; label: string } {
  switch (level) {
    case 'bon':
      return { tone: 'success', icon: 'fa-check-circle', label: 'Bon' };
    case 'à surveiller':
      return { tone: 'warning', icon: 'fa-exclamation-triangle', label: 'À surveiller' };
    case 'critique':
      return { tone: 'danger', icon: 'fa-times-circle', label: 'Critique' };
    default:
      return { tone: 'secondary', icon: 'fa-minus-circle', label: level ?? '—' };
  }
}

function downloadName(r: ActivityReport, ext: 'pdf' | 'xlsx'): string {
  return `DocTrack-${r.reference}-${r.period.label.replace(/[\s/]+/g, '-')}.${ext}`;
}

/** Mois précédent au format AAAA-MM. */
export function previousMonth(today = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Rapports d'activité (PDF + Excel) du périmètre : rapports mensuels automatiques
 * et rapports générés à la demande (un mois, une année, une période).
 */
@Component({
  selector: 'app-staff-reports',
  imports: [FormsModule, RouterLink, PageHeaderComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Rapports d'activité" subtitle="Rapport mensuel automatique (début de mois) ou à la demande, en PDF et en Excel" />

    <section class="dt-card">
      <h2 class="dt-card__title mb-2">Générer un rapport</h2>
      <form class="dt-form" (ngSubmit)="generate()">
        <div class="d-flex flex-wrap gap-3 mb-2">
          <div class="form-check"><input class="form-check-input" type="radio" name="kind" id="k-month" value="month" [(ngModel)]="kind" /><label class="form-check-label" for="k-month">Un mois</label></div>
          <div class="form-check"><input class="form-check-input" type="radio" name="kind" id="k-year" value="year" [(ngModel)]="kind" /><label class="form-check-label" for="k-year">Une année</label></div>
          <div class="form-check"><input class="form-check-input" type="radio" name="kind" id="k-range" value="range" [(ngModel)]="kind" /><label class="form-check-label" for="k-range">Une période</label></div>
        </div>
        <div class="d-flex flex-wrap align-items-end gap-2">
          @switch (kind) {
            @case ('month') { <div><label for="r-month">Mois</label><input id="r-month" name="month" type="month" class="form-control" [max]="maxMonth" [(ngModel)]="month" /></div> }
            @case ('year') { <div><label for="r-year">Année</label><input id="r-year" name="year" type="number" class="form-control" min="2024" [max]="thisYear" [(ngModel)]="year" /></div> }
            @case ('range') {
              <div><label for="r-from">Du</label><input id="r-from" name="from" type="date" class="form-control" [max]="today" [(ngModel)]="from" /></div>
              <div><label for="r-to">Au</label><input id="r-to" name="to" type="date" class="form-control" [max]="today" [(ngModel)]="to" /></div>
            }
          }
          <button type="submit" class="btn btn-dt" [disabled]="generating()">
            <i class="fas fa-cogs me-1" aria-hidden="true"></i> {{ generating() ? 'Préparation du rapport…' : 'Générer' }}
          </button>
        </div>
        <small class="dt-muted d-block mt-2">Périmètre : {{ scopeName() }}. La génération peut prendre quelques secondes.</small>
      </form>
    </section>

    @if (isSuperAdmin()) {
      <ul class="nav nav-pills mb-3">
        <li class="nav-item"><button type="button" class="nav-link" [class.active]="!narrativeFilter()" (click)="filterNarrative('')">Tous les rapports</button></li>
        <li class="nav-item"><button type="button" class="nav-link" [class.active]="narrativeFilter() === 'pending'" (click)="filterNarrative('pending')"><i class="fas fa-robot me-1" aria-hidden="true"></i>Synthèses IA à valider</button></li>
      </ul>
    }

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load(1)">Réessayer</button></app-error-state>
    } @else if (!page()?.data?.length) {
      <div class="dt-card">
        @if (narrativeFilter() === 'pending') {
          <app-empty-state icon="fa-robot" title="Aucune synthèse à valider" text="Quand l’IA rédige la synthèse d’un rapport mensuel, elle attend ici votre relecture avant l’envoi aux institutions." />
        } @else {
          <app-empty-state icon="fa-file-invoice" title="Aucun rapport pour le moment" text="Le rapport du mois écoulé est produit automatiquement au début de chaque mois." />
        }
      </div>
    } @else {
      <div class="dt-card p-0 overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr><th>Période</th><th>Périmètre</th><th>Niveau</th><th class="text-end">Alertes</th><th class="text-end">Fichiers</th></tr></thead>
            <tbody>
              @for (r of page()!.data; track r.uuid) {
                <tr>
                  <td><a [routerLink]="[r.uuid]"><b>{{ r.period.label }}</b></a>
                    <small class="d-block dt-muted"><span class="dt-mono">{{ r.reference }}</span> · {{ r.automatic ? 'automatique' : 'à la demande' }}</small></td>
                  <td class="small">{{ scopeOf(r) }}</td>
                  <td>
                    @if (r.level) {
                      <span class="badge" [class]="'text-bg-' + level(r).tone"><i class="fas {{ level(r).icon }} me-1" aria-hidden="true"></i>{{ level(r).label }}</span>
                      <small class="dt-muted ms-1">{{ r.score }}/100</small>
                    } @else { — }
                    @if (isSuperAdmin() && r.narrative_status === 'pending') { <span class="badge text-bg-warning d-table mt-1"><i class="fas fa-robot me-1" aria-hidden="true"></i>Synthèse à valider</span> }
                  </td>
                  <td class="text-end">{{ r.alerts_count }}</td>
                  <td class="text-end text-nowrap">
                    <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="downloading() === r.uuid + 'pdf'" (click)="download(r, 'pdf')" [attr.aria-label]="'PDF ' + r.period.label"><i class="fas fa-file-pdf" aria-hidden="true"></i> PDF</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary ms-1" [disabled]="downloading() === r.uuid + 'xlsx'" (click)="download(r, 'xlsx')" [attr.aria-label]="'Excel ' + r.period.label"><i class="fas fa-file-excel" aria-hidden="true"></i> Excel</button>
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
})
export class StaffReportsComponent implements OnInit {
  private readonly api = inject(PilotApi);
  private readonly notify = inject(NotifyService);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  readonly base = spaceBase();

  readonly page = signal<LaravelPage<ActivityReport> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly generating = signal(false);
  readonly downloading = signal<string | null>(null);

  readonly today = isoDate(new Date());
  readonly thisYear = new Date().getFullYear();
  readonly maxMonth = this.today.slice(0, 7);
  kind: 'month' | 'year' | 'range' = 'month';
  month = previousMonth();
  year = this.thisYear;
  from = '';
  to = this.today;

  /** Espace super admin : rapports nationaux et de toutes les institutions (donnée de route). */
  readonly national = input(false);
  readonly isSuperAdmin = this.session.isSuperAdmin;
  readonly narrativeFilter = signal('');
  readonly orgUuid = computed(() => (this.national() ? null : (this.session.activeOrganization()?.uuid ?? null)));
  readonly scopeName = computed(() => (this.national() ? 'National' : (this.session.activeOrganization()?.name ?? 'National')));

  /** ?filtre=syntheses : ouvre directement la file des synthèses IA à valider (lien de l'accueil admin). */
  readonly filtre = input<string | undefined>();

  ngOnInit(): void {
    if (this.filtre() === 'syntheses' && this.isSuperAdmin()) {
      this.narrativeFilter.set('pending');
    }
    this.load(1);
  }

  filterNarrative(status: string): void {
    this.narrativeFilter.set(status);
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.reports({ organization: this.orgUuid(), narrative_status: this.narrativeFilter() || null, page }).subscribe({
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

  level(r: ActivityReport) {
    return reportLevel(r.level);
  }

  scopeOf(r: ActivityReport): string {
    return r.scope === 'national' ? 'National' : r.scope.name;
  }

  generate(): void {
    const organization = this.orgUuid();
    let payload: Parameters<PilotApi['generateReport']>[0];
    if (this.kind === 'month') {
      if (!this.month) {
        void this.notify.error('Choisissez un mois.');
        return;
      }
      payload = { organization, month: this.month };
    } else if (this.kind === 'year') {
      payload = { organization, year: Number(this.year) };
    } else {
      if (!this.from || !this.to || this.from > this.to) {
        void this.notify.error('Choisissez une date de début antérieure à la date de fin.');
        return;
      }
      payload = { organization, from: this.from, to: this.to };
    }
    this.generating.set(true);
    this.api.generateReport(payload).subscribe({
      next: (r) => {
        this.generating.set(false);
        this.notify.success('Rapport prêt.');
        this.router.navigate([this.base + '/rapports', r.uuid]);
      },
      error: (e) => {
        this.generating.set(false);
        void this.notify.error(e, 'Rapport non généré');
      },
    });
  }

  download(r: ActivityReport, format: 'pdf' | 'xlsx'): void {
    this.downloading.set(r.uuid + format);
    this.api.reportFile(r.uuid, format).subscribe({
      next: (blob) => {
        this.downloading.set(null);
        saveBlob(blob, downloadName(r, format));
      },
      error: (e) => {
        this.downloading.set(null);
        void this.notify.error(e, 'Fichier indisponible');
      },
    });
  }
}

/** Fiche d'un rapport : niveau, synthèse, alertes, points positifs, recommandations, synthèse rédigée (si validée). */
@Component({
  selector: 'app-staff-report-detail',
  imports: [DatePipe, RouterLink, PageHeaderComponent, LoadingComponent, ErrorStateComponent, NarrativeReviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><a [routerLink]="base + '/rapports'" class="btn btn-sm btn-outline-danger">Retour</a></app-error-state>
    } @else if (report(); as r) {
      <app-page-header [title]="r.title" [subtitle]="r.period.label + ' · ' + r.reference">
        <a [routerLink]="base + '/rapports'" class="btn btn-outline-secondary">Retour</a>
        <button type="button" class="btn btn-dt" (click)="download('pdf')"><i class="fas fa-file-pdf me-1" aria-hidden="true"></i> PDF</button>
        <button type="button" class="btn btn-outline-secondary" (click)="download('xlsx')"><i class="fas fa-file-excel me-1" aria-hidden="true"></i> Excel</button>
        @if (isSuperAdmin()) {
          <button type="button" class="btn btn-outline-danger" (click)="remove()"><i class="fas fa-trash-alt me-1" aria-hidden="true"></i> Supprimer</button>
        }
      </app-page-header>

      <div class="row g-3">
        <div [class]="isSuperAdmin() ? 'col-lg-6' : 'col-lg-8'">
          @if (r.analysis; as a) {
            <section class="dt-card">
              <div class="d-flex align-items-center gap-3 mb-2">
                <span class="rp-score" [class]="'rp-score--' + lvl().tone">{{ a.score }}<small>/100</small></span>
                <div>
                  <span class="badge" [class]="'text-bg-' + lvl().tone"><i class="fas {{ lvl().icon }} me-1" aria-hidden="true"></i>{{ lvl().label }}</span>
                  <p class="small dt-muted mb-0 mt-1">Du {{ r.period.from | date: 'd MMM y' }} au {{ r.period.to | date: 'd MMM y' }}</p>
                </div>
              </div>
              <p class="mb-0">{{ a.summary }}</p>
            </section>

            @if (a.alerts.length) {
              <section class="dt-card">
                <h2 class="dt-card__title mb-2">Points d'attention</h2>
                <ul class="list-unstyled mb-0">
                  @for (al of a.alerts; track $index) {
                    <li class="d-flex gap-2 mb-2"><i class="fas mt-1" [class]="severityIcon(al.severity)" aria-hidden="true"></i>
                      <span><span class="badge text-bg-light border me-1">{{ al.severity }}</span>{{ al.message }}</span></li>
                  }
                </ul>
              </section>
            }
            @if (a.positives.length) {
              <section class="dt-card">
                <h2 class="dt-card__title mb-2">Points positifs</h2>
                <ul class="list-unstyled mb-0">
                  @for (p of a.positives; track $index) { <li class="d-flex gap-2 mb-2"><i class="fas fa-check-circle text-success mt-1" aria-hidden="true"></i><span>{{ p }}</span></li> }
                </ul>
              </section>
            }
            @if (a.recommendations.length) {
              <section class="dt-card">
                <h2 class="dt-card__title mb-2">Recommandations</h2>
                <ol class="mb-0 ps-3">
                  @for (p of a.recommendations; track $index) { <li class="mb-1">{{ p }}</li> }
                </ol>
              </section>
            }
          }
        </div>

        <div [class]="isSuperAdmin() ? 'col-lg-6' : 'col-lg-4'">
          @if (isSuperAdmin()) {
            <app-narrative-review [report]="r" (updated)="report.set($event)" />
          } @else {
          <section class="dt-card">
            <h2 class="dt-card__title mb-2">Synthèse rédigée</h2>
            @if (r.narrative; as n) {
              @if (n.summary_fr) { <p class="small">{{ n.summary_fr }}</p> }
              @if (n.highlights?.length) {
                <ul class="small ps-3">@for (h of n.highlights; track $index) { <li>{{ h }}</li> }</ul>
              }
              @if (n.recommendations?.length) {
                <p class="small fw-bold mb-1">Recommandations</p>
                <ul class="small ps-3 mb-2">@for (rec of n.recommendations; track $index) { <li><span class="badge text-bg-light border me-1">{{ rec.priority }}</span>{{ rec.text }}</li> }</ul>
              }
              <p class="small dt-muted mb-0"><i class="fas fa-robot me-1" aria-hidden="true"></i>Rédigée avec l'aide de l'IA à partir des chiffres{{ r.narrative_status === 'approved' ? ', relue et validée' : '' }}.</p>
            } @else {
              <p class="small dt-muted mb-0">{{ narrativeText(r.narrative_status) }}</p>
            }
          </section>
          }
          <section class="dt-card small">
            <p class="mb-1"><span class="dt-muted">Périmètre :</span> {{ r.scope === 'national' ? 'National' : r.scope.name }}</p>
            <p class="mb-1"><span class="dt-muted">Produit :</span> {{ r.automatic ? 'automatiquement' : 'à la demande' }}, le {{ r.created_at | date: 'd MMM y, HH:mm' }}</p>
            @if (r.delivered_at) { <p class="mb-0"><span class="dt-muted">Diffusé le :</span> {{ r.delivered_at | date: 'd MMM y' }}</p> }
          </section>
        </div>
      </div>
    }
  `,
  styles: `
    .rp-score { font-size: 2.4rem; font-weight: 700; line-height: 1; color: #13294b; }
    .rp-score small { font-size: .9rem; color: #5f6b7a; font-weight: 400; }
    .rp-score--success { color: #1e7a46; }
    .rp-score--warning { color: #9a6200; }
    .rp-score--danger { color: #b3261e; }
  `,
})
export class StaffReportDetailComponent implements OnInit {
  private readonly api = inject(PilotApi);
  private readonly notify = inject(NotifyService);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  readonly base = spaceBase();

  readonly uuid = input.required<string>();
  readonly report = signal<ActivityReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isSuperAdmin = this.session.isSuperAdmin;
  readonly lvl = computed(() => reportLevel(this.report()?.analysis?.level ?? this.report()?.level));

  ngOnInit(): void {
    this.api.report(this.uuid()).subscribe({
      next: (r) => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Rapport introuvable.'));
        this.loading.set(false);
      },
    });
  }

  severityIcon(severity: string): string {
    return severity === 'critique' ? 'fa-times-circle text-danger' : severity === 'important' ? 'fa-exclamation-triangle text-warning' : 'fa-info-circle text-primary';
  }

  narrativeText(status: string | null): string {
    switch (status) {
      case 'pending':
        return 'Une synthèse rédigée est en cours de relecture par l’administrateur : elle apparaîtra ici une fois validée.';
      case 'rejected':
        return 'La synthèse proposée n’a pas été retenue ; le rapport chiffré fait foi.';
      case 'failed':
        return 'Pas de synthèse rédigée pour ce rapport : les chiffres et l’analyse ci-contre font foi.';
      default:
        return 'Pas de synthèse rédigée pour ce rapport.';
    }
  }

  download(format: 'pdf' | 'xlsx'): void {
    const r = this.report();
    if (!r) {
      return;
    }
    this.api.reportFile(r.uuid, format).subscribe({
      next: (blob) => saveBlob(blob, downloadName(r, format)),
      error: (e) => void this.notify.error(e, 'Fichier indisponible'),
    });
  }

  async remove(): Promise<void> {
    const ok = await this.notify.confirm({ title: 'Supprimer ce rapport ?', text: 'Le PDF et le fichier Excel seront supprimés.', confirmText: 'Supprimer', danger: true });
    if (!ok) {
      return;
    }
    this.api.deleteReport(this.uuid()).subscribe({
      next: () => {
        this.notify.success('Rapport supprimé.');
        this.router.navigate([this.base + '/rapports']);
      },
      error: (e) => void this.notify.error(e),
    });
  }
}
