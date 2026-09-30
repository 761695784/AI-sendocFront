import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../../core/session/session.store';
import { ApiV2Client, apiErrorMessage } from '../../../core/api/api-v2.client';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { LoadingComponent } from '../../../shared/ui/state.components';
import { STAFF_MENU } from '../staff-menu';

/** Chiffres principaux renvoyés par GET /api/v2/stats/overview (sous-ensemble utilisé ici). */
interface Overview {
  declarations?: { counter?: number };
  found_documents?: { in_custody_now?: number };
  matches?: { pending_review_now?: number; overdue_reviews_now?: number };
  restitutions?: { completed?: number };
  period?: { from: string; to: string };
}

/** Tableau de bord de l'espace structure : chiffres clés (responsables) et raccourcis (tous). */
@Component({
  selector: 'app-staff-home',
  imports: [RouterLink, PageHeaderComponent, LoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="'Bonjour ' + firstName()" [subtitle]="organizationName()" />

    @if (canSeeStats()) {
      @if (loading()) {
        <app-loading label="Chargement des chiffres…" />
      } @else if (error()) {
        <div class="alert alert-warning">{{ error() }}</div>
      } @else if (overview(); as o) {
        <section class="kpis" aria-label="Chiffres clés des 30 derniers jours">
          <div class="kpi"><span>Déclarations au guichet</span><strong>{{ o.declarations?.counter ?? 0 }}</strong></div>
          <div class="kpi"><span>Documents en garde</span><strong>{{ o.found_documents?.in_custody_now ?? 0 }}</strong></div>
          <div class="kpi" [class.kpi--alert]="(o.matches?.overdue_reviews_now ?? 0) > 0">
            <span>Correspondances à examiner</span><strong>{{ o.matches?.pending_review_now ?? 0 }}</strong>
            @if ((o.matches?.overdue_reviews_now ?? 0) > 0) {
              <small>dont {{ o.matches?.overdue_reviews_now }} en retard</small>
            }
          </div>
          <div class="kpi"><span>Restitutions faites</span><strong>{{ o.restitutions?.completed ?? 0 }}</strong></div>
        </section>
      }
    }

    <h2 class="h6 text-uppercase text-muted mt-4 mb-3">Accès rapide</h2>
    <section class="shortcuts">
      @for (item of shortcuts(); track item.path) {
        <a class="shortcut" [routerLink]="['/espace', item.path]">
          <i class="fas {{ item.icon }}" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
        </a>
      }
    </section>
  `,
  styles: `
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
    .kpi { background: #fff; border: 1px solid #e3e8ef; border-radius: .75rem; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: .25rem; }
    .kpi span { color: #5f6b7a; font-size: .85rem; }
    .kpi strong { font-size: 1.9rem; color: #13294b; line-height: 1.1; }
    .kpi small { color: #a52a2a; font-weight: 600; }
    .kpi--alert { border-color: #f1b8b8; }
    .shortcuts { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: .75rem; }
    .shortcut { display: flex; align-items: center; gap: .75rem; padding: .9rem 1rem; background: #fff; border: 1px solid #e3e8ef;
      border-radius: .75rem; color: #1c2430; text-decoration: none; font-weight: 500; }
    .shortcut:hover { border-color: #f6a500; }
    .shortcut i { color: #13294b; width: 1.2rem; text-align: center; }
  `,
})
export class StaffHomeComponent implements OnInit {
  private readonly session = inject(SessionStore);
  private readonly api = inject(ApiV2Client);

  readonly overview = signal<Overview | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly firstName = computed(() => (this.session.user()?.FirstName as string) || '');
  readonly organizationName = computed(() => this.session.activeOrganization()?.name ?? '');
  readonly canSeeStats = computed(() => this.session.can('stats.view'));

  readonly shortcuts = computed(() => {
    this.session.abilities();
    return STAFF_MENU.flatMap((s) => s.items).filter(
      (i) => i.path && i.path !== 'messages' && (!i.abilities || this.session.canAny(i.abilities)),
    );
  });

  ngOnInit(): void {
    if (!this.canSeeStats()) {
      return;
    }
    this.loading.set(true);
    this.api.get<Overview>(['stats', 'overview']).subscribe({
      next: (o) => {
        this.overview.set(o);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Chiffres indisponibles pour le moment.'));
        this.loading.set(false);
      },
    });
  }
}
