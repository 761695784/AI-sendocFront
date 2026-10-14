import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { PilotApi } from '../../../core/api/pilot.api';
import { StatsOverview } from '../../../core/api/pilot.types';
import { SessionStore } from '../../../core/session/session.store';
import { PublicationsService } from '../../../components/services/publications.service';
import { AuthService } from '../../../components/services/auth.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { LoadingComponent } from '../../../shared/ui/state.components';
import { BarItem, BarListComponent } from '../../../shared/ui/bar-list.component';
import { isoDate, lastDays } from '../../staff/stats/stats.component';
import { ADMIN_MENU } from '../admin-menu';

/** Un chiffre indisponible (droit, panne) ne bloque pas l'accueil : il s'affiche « — ». */
function orNull<T>(source: Observable<T>): Observable<T | null> {
  return source.pipe(catchError(() => of(null)));
}

/** Début du cumul « depuis le lancement » (avant toute donnée DocTrack). */
export const LAUNCH_DATE = '2024-01-01';

interface Todo {
  label: string;
  count: number | null;
  link: string;
  queryParams?: Record<string, string>;
  icon: string;
  hint: string;
}

/** Réponses des anciens services (V1) : { data: [{ typeName, count }] } et [{ subject, count }]. */
export function toBars(rows: unknown, label: string): BarItem[] {
  const list = Array.isArray(rows) ? rows : Array.isArray((rows as { data?: unknown })?.data) ? (rows as { data: unknown[] }).data : [];
  return list
    .map((r) => r as Record<string, unknown>)
    .map((r) => ({ label: String(r[label] ?? '—'), value: Number(r['count'] ?? 0) }))
    .filter((r) => Number.isFinite(r.value));
}

/** Chiffres d'une période : déclarations (guichet + en ligne) et documents trouvés (guichet + publiés). */
export function totals(o: StatsOverview | null) {
  if (!o) {
    return null;
  }
  return {
    declarations: o.declarations.counter + (o.declarations.online ?? 0),
    declarationsCounter: o.declarations.counter,
    declarationsOnline: o.declarations.online ?? 0,
    found: o.found_documents.deposited_at_counter + (o.found_documents.published_online ?? 0),
    published: o.found_documents.published_online ?? 0,
    inCustody: o.found_documents.in_custody_now,
    matches: o.matches.created,
    pendingMatches: o.matches.pending_review_now,
    restitutions: o.restitutions.completed,
    rate: o.found_documents.restitution_rate_pct,
  };
}

/**
 * Accueil du super admin, avec les données réelles de la plateforme :
 * chiffres cumulés depuis le lancement (et la part des 30 derniers jours), ce qui attend une décision,
 * la répartition des publications et des emails, puis les raccourcis.
 */
@Component({
  selector: 'app-admin-home',
  imports: [DecimalPipe, RouterLink, PageHeaderComponent, LoadingComponent, BarListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="'Bonjour ' + firstName()" subtitle="Administration nationale de DocTrack — vue d'ensemble et points à traiter" />

    @if (loading()) {
      <app-loading label="Chargement des chiffres…" />
    } @else {
      @if (all(); as t) {
        <!-- Chiffres nationaux cumulés : tuiles pleines violet / or, comme le tableau de bord historique -->
        <section class="dt-kpis" aria-label="Chiffres nationaux depuis le lancement">
          <a class="dt-kpi" routerLink="/admin/admindec">
            <span class="dt-kpi__icon"><i class="fas fa-file-alt" aria-hidden="true"></i></span>
            <div><strong class="dt-kpi__num">{{ t.declarations | number }}</strong><span class="dt-kpi__label">Déclarations de perte</span>
              <small class="dt-kpi__hint">{{ t.declarationsCounter | number }} au guichet · {{ t.declarationsOnline | number }} en ligne{{ recentHint('declarations') }}</small></div>
          </a>
          <a class="dt-kpi dt-kpi--gold" routerLink="/admin/adminpub">
            <span class="dt-kpi__icon"><i class="fas fa-id-card" aria-hidden="true"></i></span>
            <div><strong class="dt-kpi__num">{{ t.found | number }}</strong><span class="dt-kpi__label">Documents trouvés</span>
              <small class="dt-kpi__hint">{{ t.published | number }} publiés en ligne · {{ t.inCustody | number }} sous garde</small></div>
          </a>
          <a class="dt-kpi" routerLink="/admin/statistiques">
            <span class="dt-kpi__icon"><i class="fas fa-link" aria-hidden="true"></i></span>
            <div><strong class="dt-kpi__num">{{ t.matches | number }}</strong><span class="dt-kpi__label">Correspondances</span>
              <small class="dt-kpi__hint">{{ t.pendingMatches | number }} à examiner{{ recentHint('matches') }}</small></div>
          </a>
          <a class="dt-kpi dt-kpi--gold" routerLink="/admin/admincertif">
            <span class="dt-kpi__icon"><i class="fas fa-hands-helping" aria-hidden="true"></i></span>
            <div><strong class="dt-kpi__num">{{ t.restitutions | number }}</strong><span class="dt-kpi__label">Restitutions</span>
              <small class="dt-kpi__hint">
                @if (restitutionRequests() !== null) { {{ restitutionRequests() | number }} demande(s) en ligne · }
                taux {{ t.rate === null ? '—' : (t.rate | number: '1.0-1') + ' %' }}
              </small></div>
          </a>
        </section>
        <p class="ah-period">Depuis le lancement de la plateforme · niveau national</p>
      }

      <h2 class="ah-h dt-section-title">À traiter</h2>
      <section class="ah-grid">
        @for (t of todos(); track t.label) {
          <a class="ah-todo" [class.ah-todo--on]="(t.count ?? 0) > 0" [routerLink]="t.link" [queryParams]="t.queryParams">
            <span class="ah-todo__icon"><i class="fas {{ t.icon }}" aria-hidden="true"></i></span>
            <span class="ah-todo__body">
              <strong>{{ t.count === null ? '—' : (t.count | number) }}</strong>
              <span class="ah-todo__label">{{ t.label }}</span>
              <small>{{ t.hint }}</small>
            </span>
          </a>
        }
      </section>

      <h2 class="ah-h dt-section-title">Répartition</h2>
      <section class="ah-charts">
        <article class="dt-card">
          <h3 class="ah-chart-title"><i class="fas fa-newspaper" aria-hidden="true"></i>Publications par type de document</h3>
          <app-bar-list [items]="publicationsByType()" empty="Aucune publication pour le moment" />
        </article>
        <article class="dt-card">
          <h3 class="ah-chart-title"><i class="fas fa-envelope" aria-hidden="true"></i>Emails envoyés par type</h3>
          <app-bar-list [items]="emailsByType()" empty="Aucun email envoyé pour le moment" />
        </article>
      </section>
    }

    <h2 class="ah-h dt-section-title">Accès rapide</h2>
    <section class="dt-links">
      @for (item of shortcuts; track item.path) {
        <a class="dt-link" [routerLink]="['/admin', item.path]">
          <span class="dt-link__icon"><i class="fas {{ item.icon }}" aria-hidden="true"></i></span><span>{{ item.label }}</span>
          <i class="fas fa-chevron-right dt-link__go" aria-hidden="true"></i>
        </a>
      }
    </section>
  `,
  styles: `
    .ah-h { font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: #5f6b7a; margin: 1.5rem 0 .6rem; }
    .ah-period { margin: .5rem 0 0; font-size: 12px; color: #5f6b7a; text-align: right; }

    /* À traiter */
    .ah-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
    .ah-todo { display: flex; gap: 14px; align-items: flex-start; padding: 18px 20px; background: #fff; border: 1px solid rgba(49, 40, 124, .08);
      border-radius: 14px; box-shadow: 0 2px 10px rgba(49, 40, 124, .06); color: inherit; text-decoration: none;
      transition: transform .15s, box-shadow .15s, border-color .15s; }
    .ah-todo:hover { transform: translateY(-2px); border-color: #31287c; box-shadow: 0 8px 22px rgba(49, 40, 124, .12); }
    .ah-todo__icon { flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font-size: 18px;
      background: #f0eeff; color: #31287c; }
    .ah-todo--on { border-color: rgba(246, 165, 0, .55); }
    .ah-todo--on .ah-todo__icon { background: #f6a500; color: #31287c; }
    .ah-todo__body { display: flex; flex-direction: column; min-width: 0; }
    .ah-todo__body strong { font-size: 24px; font-weight: 800; color: #31287c; line-height: 1.1; }
    .ah-todo__label { font-size: 14px; font-weight: 600; color: #1f1a4d; }
    .ah-todo__body small { margin-top: 2px; font-size: 12px; color: #5f6b7a; }

    /* Répartition */
    .ah-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
    .ah-charts .dt-card { margin: 0; }
    .ah-chart-title { display: flex; align-items: center; gap: .6rem; margin: 0 0 1.1rem; font-size: 15px; font-weight: 700; color: #31287c; }
    .ah-chart-title i { color: #f6a500; }
    @media (max-width: 575.98px) { .ah-charts { grid-template-columns: 1fr; } }
  `,
})
export class AdminHomeComponent implements OnInit {
  private readonly api = inject(PilotApi);
  private readonly session = inject(SessionStore);
  private readonly publications = inject(PublicationsService);
  private readonly legacy = inject(AuthService);

  readonly firstName = computed(() => (this.session.user()?.FirstName as string) || '');
  readonly loading = signal(true);
  /** Depuis le lancement, et sur les 30 derniers jours. */
  readonly overviewAll = signal<StatsOverview | null>(null);
  readonly overviewRecent = signal<StatsOverview | null>(null);
  readonly all = computed(() => totals(this.overviewAll()));
  readonly recent = computed(() => totals(this.overviewRecent()));
  readonly restitutionRequests = signal<number | null>(null);
  readonly publicationsByType = signal<BarItem[]>([]);
  readonly emailsByType = signal<BarItem[]>([]);
  readonly todos = signal<Todo[]>([]);
  readonly shortcuts = ADMIN_MENU.flatMap((s) => s.items).filter((i) => i.path && !i.legacy && !i.href && i.path !== 'profil');

  /** « · +12 ces 30 jours » sous un chiffre cumulé. */
  recentHint(key: 'declarations' | 'matches'): string {
    const n = this.recent()?.[key];
    return n ? ` · +${n} ces 30 jours` : '';
  }

  ngOnInit(): void {
    forkJoin({
      all: orNull(this.api.overview({ organization: null, from: LAUNCH_DATE, to: isoDate(new Date()) })),
      recent: orNull(this.api.overview({ organization: null, ...lastDays(30) })),
      narratives: orNull(this.api.reports({ narrative_status: 'pending' }).pipe(map((p) => p.total))),
      alerts: orNull(this.api.alerts({ status: 'open', level: 'high', per_page: 1 }).pipe(map((l) => l.meta.total))),
      smsFailed: orNull(this.api.deliveries({ channel: 'sms', status: 'failed' }).pipe(map((p) => p.total))),
      byType: orNull(this.publications.getPublicationsByType()),
      emails: orNull(this.publications.getEmailActivity()),
      requests: orNull(this.legacy.getRestitutionRequestCount().pipe(map((r: { count?: number }) => r?.count ?? null))),
    }).subscribe((r) => {
      this.overviewAll.set(r.all);
      this.overviewRecent.set(r.recent);
      this.publicationsByType.set(toBars(r.byType, 'typeName'));
      this.emailsByType.set(toBars(r.emails, 'subject'));
      this.restitutionRequests.set(r.requests);
      this.todos.set([
        { label: 'Synthèses IA à valider', count: r.narratives, link: '/admin/rapports', queryParams: { filtre: 'syntheses' }, icon: 'fa-robot', hint: 'Rien ne part aux institutions sans votre accord' },
        { label: 'Alertes de vigilance hautes', count: r.alerts, link: '/admin/vigilance', icon: 'fa-shield-alt', hint: 'Bloquent la restitution sans dérogation' },
        { label: 'Retraits sans structure', count: r.recent?.collections.unassigned_now ?? null, link: '/admin/structures', icon: 'fa-map-marker-alt', hint: 'Aucune structure proche : vérifier les positions GPS' },
        { label: 'SMS en échec', count: r.smsFailed, link: '/admin/envois', icon: 'fa-sms', hint: 'Peuvent être relancés' },
      ]);
      this.loading.set(false);
    });
  }
}
