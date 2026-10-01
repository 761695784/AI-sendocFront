import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { PilotApi } from '../../../core/api/pilot.api';
import { StatsOverview } from '../../../core/api/pilot.types';
import { SessionStore } from '../../../core/session/session.store';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { LoadingComponent } from '../../../shared/ui/state.components';
import { lastDays } from '../../staff/stats/stats.component';
import { ADMIN_MENU } from '../admin-menu';

/** Un chiffre indisponible (droit, panne) ne bloque pas l'accueil : il s'affiche « — ». */
function orNull<T>(source: Observable<T>): Observable<T | null> {
  return source.pipe(catchError(() => of(null)));
}

interface Todo {
  label: string;
  count: number | null;
  link: string;
  queryParams?: Record<string, string>;
  icon: string;
  hint: string;
}

/**
 * Accueil du super admin : ce qui attend une décision (synthèses IA, alertes hautes, retraits sans structure,
 * SMS en échec), les chiffres nationaux des 30 derniers jours, et les raccourcis.
 */
@Component({
  selector: 'app-admin-home',
  imports: [DecimalPipe, RouterLink, PageHeaderComponent, LoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="'Bonjour ' + firstName()" subtitle="Administration nationale de DocTrack" />

    @if (loading()) {
      <app-loading label="Chargement…" />
    } @else {
      <h2 class="ah-h">À traiter</h2>
      <section class="ah-grid">
        @for (t of todos(); track t.label) {
          <a class="ah-todo" [class.ah-todo--on]="(t.count ?? 0) > 0" [routerLink]="t.link" [queryParams]="t.queryParams">
            <i class="fas {{ t.icon }}" aria-hidden="true"></i>
            <span class="ah-todo__body">
              <strong>{{ t.count === null ? '—' : (t.count | number) }}</strong>
              <span>{{ t.label }}</span>
              <small>{{ t.hint }}</small>
            </span>
          </a>
        }
      </section>

      @if (overview(); as o) {
        <h2 class="ah-h">Au niveau national — 30 derniers jours</h2>
        <section class="ah-grid">
          <div class="ah-kpi"><span>Déclarations</span><strong>{{ (o.declarations.counter + (o.declarations.online ?? 0)) | number }}</strong><small>{{ o.declarations.counter }} au guichet · {{ o.declarations.online ?? 0 }} en ligne</small></div>
          <div class="ah-kpi"><span>Documents trouvés</span><strong>{{ (o.found_documents.deposited_at_counter + (o.found_documents.published_online ?? 0)) | number }}</strong><small>{{ o.found_documents.in_custody_now }} sous garde aujourd'hui</small></div>
          <div class="ah-kpi"><span>Correspondances</span><strong>{{ o.matches.created | number }}</strong><small>{{ o.matches.pending_review_now }} à examiner</small></div>
          <div class="ah-kpi"><span>Restitutions</span><strong>{{ o.restitutions.completed | number }}</strong><small>taux {{ o.found_documents.restitution_rate_pct ?? '—' }} %</small></div>
        </section>
      }
    }

    <h2 class="ah-h">Accès rapide</h2>
    <section class="ah-links">
      @for (item of shortcuts; track item.path) {
        <a class="ah-link" [routerLink]="['/admin', item.path]"><i class="fas {{ item.icon }}" aria-hidden="true"></i><span>{{ item.label }}</span></a>
      }
    </section>
  `,
  styles: `
    .ah-h { font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: #5f6b7a; margin: 1.5rem 0 .6rem; }
    .ah-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: .75rem; }
    .ah-todo { display: flex; gap: .8rem; align-items: flex-start; padding: .9rem 1rem; background: #fff; border: 1px solid #e3e8ef;
      border-radius: .75rem; color: inherit; text-decoration: none; }
    .ah-todo > i { font-size: 1.2rem; color: #9aa5b1; margin-top: .3rem; width: 1.3rem; text-align: center; }
    .ah-todo--on { border-color: #f6a500; background: #fffaf0; }
    .ah-todo--on > i { color: #b36b00; }
    .ah-todo:hover { border-color: #31287c; }
    .ah-todo__body { display: flex; flex-direction: column; }
    .ah-todo__body strong { font-size: 1.6rem; color: #13294b; line-height: 1.1; }
    .ah-todo__body small, .ah-kpi small { color: #5f6b7a; font-size: .8rem; }
    .ah-kpi { background: #fff; border: 1px solid #e3e8ef; border-radius: .75rem; padding: .9rem 1rem; display: flex; flex-direction: column; }
    .ah-kpi span { color: #5f6b7a; font-size: .85rem; }
    .ah-kpi strong { font-size: 1.7rem; color: #13294b; }
    .ah-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: .75rem; }
    .ah-link { display: flex; align-items: center; gap: .75rem; padding: .85rem 1rem; background: #fff; border: 1px solid #e3e8ef; border-radius: .75rem;
      color: #1c2430; text-decoration: none; font-weight: 500; }
    .ah-link:hover { border-color: #f6a500; }
    .ah-link i { color: #31287c; width: 1.2rem; text-align: center; }
  `,
})
export class AdminHomeComponent implements OnInit {
  private readonly api = inject(PilotApi);
  private readonly session = inject(SessionStore);

  readonly firstName = computed(() => (this.session.user()?.FirstName as string) || '');
  readonly loading = signal(true);
  readonly overview = signal<StatsOverview | null>(null);
  readonly todos = signal<Todo[]>([]);
  readonly shortcuts = ADMIN_MENU.flatMap((s) => s.items).filter((i) => i.path && !i.legacy);

  ngOnInit(): void {
    forkJoin({
      overview: orNull(this.api.overview({ organization: null, ...lastDays(30) })),
      narratives: orNull(this.api.reports({ narrative_status: 'pending' }).pipe(map((p) => p.total))),
      alerts: orNull(this.api.alerts({ status: 'open', level: 'high', per_page: 1 }).pipe(map((l) => l.meta.total))),
      smsFailed: orNull(this.api.deliveries({ channel: 'sms', status: 'failed' }).pipe(map((p) => p.total))),
    }).subscribe((r) => {
      this.overview.set(r.overview);
      this.todos.set([
        { label: 'Synthèses IA à valider', count: r.narratives, link: '/admin/rapports', queryParams: { filtre: 'syntheses' }, icon: 'fa-robot', hint: 'Rien ne part aux institutions sans votre accord' },
        { label: 'Alertes de vigilance hautes', count: r.alerts, link: '/admin/vigilance', icon: 'fa-shield-alt', hint: 'Bloquent la restitution sans dérogation' },
        { label: 'Retraits sans structure', count: r.overview?.collections.unassigned_now ?? null, link: '/admin/structures', icon: 'fa-map-marker-alt', hint: 'Aucune structure proche : vérifier les positions GPS' },
        { label: 'SMS en échec', count: r.smsFailed, link: '/admin/envois', icon: 'fa-sms', hint: 'Peuvent être relancés' },
      ]);
      this.loading.set(false);
    });
  }
}
