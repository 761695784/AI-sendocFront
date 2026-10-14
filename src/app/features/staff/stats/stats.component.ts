import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PilotApi, StatsQuery } from '../../../core/api/pilot.api';
import { METRIC_LABELS, OverdueCollections, StatsOverview, StructureRow, StructuresStats, TimeseriesMetric } from '../../../core/api/pilot.types';
import { apiErrorMessage, saveBlob } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { ColumnChartComponent, ColumnPoint } from './column-chart.component';

export type PeriodKey = '7' | '30' | '90' | '365' | 'custom';

const STRUCTURES_PAGE = 25;

/** Volume d'activité d'une structure (pour classer le tableau comparatif). */
export function structureActivity(r: StructureRow): number {
  return r.collections_assigned + r.collected + r.in_custody_now + r.pending_reviews_now + r.counter_declarations + r.restitutions + r.collections_overdue_now;
}

/** Recherche par nom ou rattachement ; les structures les plus actives d'abord ; sans activité masquées si demandé. */
export function filterStructureRows(rows: StructureRow[], search: string, onlyWithActivity: boolean): StructureRow[] {
  const q = search.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return rows
    .filter((r) => !onlyWithActivity || structureActivity(r) > 0)
    .filter((r) => !q || `${r.name} ${r.parent ?? ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q))
    .sort((a, b) => structureActivity(b) - structureActivity(a) || a.name.localeCompare(b.name, 'fr'));
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Date locale au format AAAA-MM-JJ (sans décalage de fuseau). */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Période glissante de n jours se terminant aujourd'hui. */
export function lastDays(days: number, today = new Date()): { from: string; to: string } {
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { from: isoDate(from), to: isoDate(today) };
}

/** Libellés d'une période renvoyée par l'API (jour AAAA-MM-JJ, semaine AAAA-Wnn, mois AAAA-MM). */
export function periodLabels(period: string, interval: 'day' | 'week' | 'month'): { label: string; title: string } {
  if (interval === 'week') {
    const [year, week] = period.split('-W');
    return { label: `S${Number(week)}`, title: `Semaine ${Number(week)} (${year})` };
  }
  if (interval === 'month') {
    const [year, month] = period.split('-').map(Number);
    return { label: `${MONTHS[month - 1]} ${String(year).slice(2)}`, title: `${MONTHS[month - 1]} ${year}` };
  }
  const [year, month, day] = period.split('-').map(Number);
  return { label: `${day} ${MONTHS[month - 1]}`, title: `${day} ${MONTHS[month - 1]} ${year}` };
}

/**
 * Statistiques et délais du périmètre de la structure active (sa descendance comprise pour une institution) :
 * délais de réaction (SLA), activité, stock sous garde, évolution, retraits en retard, comparaison des structures.
 */
@Component({
  selector: 'app-staff-stats',
  imports: [DatePipe, DecimalPipe, NgTemplateOutlet, FormsModule, RouterLink, PageHeaderComponent, LoadingComponent, ErrorStateComponent, ColumnChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css',
})
export class StaffStatsComponent implements OnInit {
  private readonly api = inject(PilotApi);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);

  readonly periods: { key: PeriodKey; label: string }[] = [
    { key: '7', label: '7 jours' },
    { key: '30', label: '30 jours' },
    { key: '90', label: '3 mois' },
    { key: '365', label: '12 mois' },
    { key: 'custom', label: 'Autre période' },
  ];
  readonly metrics = Object.entries(METRIC_LABELS) as [TimeseriesMetric, string][];

  /** Espace super admin : chiffres nationaux, quelle que soit la structure active (donnée de route). */
  readonly national = input(false);

  readonly period = signal<PeriodKey>('30');
  customFrom = lastDays(30).from;
  customTo = isoDate(new Date());

  readonly metric = signal<TimeseriesMetric>('counter_declarations');
  readonly interval = signal<'day' | 'week' | 'month'>('week');

  readonly overview = signal<StatsOverview | null>(null);
  readonly structures = signal<StructuresStats | null>(null);
  readonly overdue = signal<OverdueCollections | null>(null);
  readonly series = signal<ColumnPoint[]>([]);
  readonly loading = signal(true);
  readonly seriesLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

  readonly scopeName = computed(() => this.overview()?.scope.organization?.name ?? 'National');
  readonly metricLabel = computed(() => METRIC_LABELS[this.metric()]);
  /** Tableau comparatif utile seulement s'il y a plusieurs structures. */
  readonly showStructures = computed(() => (this.structures()?.data.length ?? 0) > 1);

  // ── Comparaison des structures : recherche, structures actives d'abord, affichage par 25 ──
  readonly structureSearch = signal('');
  readonly onlyWithActivity = signal(true);
  readonly showAllStructures = signal(false);
  readonly structureRows = computed(() => filterStructureRows(this.structures()?.data ?? [], this.structureSearch(), this.onlyWithActivity()));
  readonly visibleStructureRows = computed(() => (this.showAllStructures() ? this.structureRows() : this.structureRows().slice(0, STRUCTURES_PAGE)));
  readonly structuresPage = STRUCTURES_PAGE;

  ngOnInit(): void {
    this.loadAll();
  }

  query(): StatsQuery {
    const range = this.period() === 'custom' ? { from: this.customFrom, to: this.customTo } : lastDays(Number(this.period()));
    return { organization: this.national() ? null : (this.session.activeOrganization()?.uuid ?? null), ...range };
  }

  selectPeriod(key: PeriodKey): void {
    this.period.set(key);
    if (key !== 'custom') {
      // Regroupement adapté à la durée : jours sur 7 j, semaines sur 30 j et 3 mois, mois sur 12 mois.
      this.interval.set(key === '365' ? 'month' : key === '7' ? 'day' : 'week');
      this.loadAll();
    }
  }

  applyCustom(): void {
    if (!this.customFrom || !this.customTo || this.customFrom > this.customTo) {
      void this.notify.error('Choisissez une date de début antérieure à la date de fin.');
      return;
    }
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    const q = this.query();
    forkJoin({
      overview: this.api.overview(q),
      structures: this.api.structures(q),
      overdue: this.api.overdueCollections(q.organization),
    }).subscribe({
      next: (r) => {
        this.overview.set(r.overview);
        this.structures.set(r.structures);
        this.overdue.set(r.overdue);
        this.loading.set(false);
        this.loadSeries();
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Statistiques indisponibles.'));
        this.loading.set(false);
      },
    });
  }

  loadSeries(): void {
    this.seriesLoading.set(true);
    const interval = this.interval();
    this.api.timeseries(this.metric(), interval, this.query()).subscribe({
      next: (t) => {
        this.series.set(t.points.map((p) => ({ ...periodLabels(p.period, interval), value: p.value })));
        this.seriesLoading.set(false);
      },
      error: () => {
        this.series.set([]);
        this.seriesLoading.set(false);
      },
    });
  }

  setMetric(metric: TimeseriesMetric): void {
    this.metric.set(metric);
    this.loadSeries();
  }

  setInterval(interval: 'day' | 'week' | 'month'): void {
    this.interval.set(interval);
    this.loadSeries();
  }

  exportCsv(): void {
    const q = this.query();
    this.exporting.set(true);
    this.api.structuresCsv(q).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        saveBlob(blob, `doctrack-structures-${q.from}-${q.to}.csv`);
      },
      error: (e) => {
        this.exporting.set(false);
        void this.notify.error(e, 'Export impossible');
      },
    });
  }

  /** Heures lisibles : « 5 h », « 2 j 3 h », « — » si pas de mesure. */
  hours(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    if (value < 48) {
      return `${Math.round(value * 10) / 10} h`.replace('.', ',');
    }
    const days = Math.floor(value / 24);
    const rest = Math.round(value - days * 24);
    return rest ? `${days} j ${rest} h` : `${days} j`;
  }

  /** Couleur de statut d'un indicateur de délai (respecté / proche / dépassé). */
  slaTone(value: number | null | undefined, limit: number): 'good' | 'warn' | 'bad' | 'none' {
    if (value === null || value === undefined) {
      return 'none';
    }
    return value <= limit ? 'good' : value <= limit * 1.5 ? 'warn' : 'bad';
  }

  pctTone(value: number | null | undefined): 'good' | 'warn' | 'bad' | 'none' {
    if (value === null || value === undefined) {
      return 'none';
    }
    return value >= 90 ? 'good' : value >= 70 ? 'warn' : 'bad';
  }
}
