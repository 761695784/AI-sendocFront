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
    <app-page-header [title]="'Bonjour ' + firstName()" [subtitle]="organizationName() || 'Espace des structures'" icon="fa-tachometer-alt" />

    @if (canSeeStats()) {
      @if (loading()) {
        <app-loading label="Chargement des chiffres…" />
      } @else if (error()) {
        <div class="dt-callout dt-callout--warning mt-0"><i class="fas fa-exclamation-triangle" aria-hidden="true"></i><div>{{ error() }}</div></div>
      } @else if (overview(); as o) {
        <section class="dt-kpis" aria-label="Chiffres clés des 30 derniers jours">
          <a class="dt-kpi" routerLink="/espace/declarations">
            <span class="dt-kpi__icon"><i class="fas fa-file-alt" aria-hidden="true"></i></span>
            <div><strong class="dt-kpi__num">{{ o.declarations?.counter ?? 0 }}</strong><span class="dt-kpi__label">Déclarations au guichet</span>
              <small class="dt-kpi__hint">30 derniers jours</small></div>
          </a>
          <a class="dt-kpi dt-kpi--gold" routerLink="/espace/documents">
            <span class="dt-kpi__icon"><i class="fas fa-id-card" aria-hidden="true"></i></span>
            <div><strong class="dt-kpi__num">{{ o.found_documents?.in_custody_now ?? 0 }}</strong><span class="dt-kpi__label">Documents en garde</span>
              <small class="dt-kpi__hint">aujourd'hui</small></div>
          </a>
          <a class="dt-kpi" routerLink="/espace/correspondances" [class.dt-kpi--alert]="(o.matches?.overdue_reviews_now ?? 0) > 0">
            <span class="dt-kpi__icon"><i class="fas fa-link" aria-hidden="true"></i></span>
            <div><strong class="dt-kpi__num">{{ o.matches?.pending_review_now ?? 0 }}</strong><span class="dt-kpi__label">Correspondances à examiner</span>
              <small class="dt-kpi__hint">
                @if ((o.matches?.overdue_reviews_now ?? 0) > 0) { dont {{ o.matches?.overdue_reviews_now }} en retard } @else { aucune en retard }
              </small></div>
          </a>
          <a class="dt-kpi dt-kpi--gold" routerLink="/espace/restitutions">
            <span class="dt-kpi__icon"><i class="fas fa-hands-helping" aria-hidden="true"></i></span>
            <div><strong class="dt-kpi__num">{{ o.restitutions?.completed ?? 0 }}</strong><span class="dt-kpi__label">Restitutions faites</span>
              <small class="dt-kpi__hint">30 derniers jours</small></div>
          </a>
        </section>
      }
    }

    <h2 class="sh-h dt-section-title">Accès rapide</h2>
    <section class="dt-links">
      @for (item of shortcuts(); track item.path) {
        <a class="dt-link" [routerLink]="['/espace', item.path]">
          <span class="dt-link__icon"><i class="fas {{ item.icon }}" aria-hidden="true"></i></span><span>{{ item.label }}</span>
          <i class="fas fa-chevron-right dt-link__go" aria-hidden="true"></i>
        </a>
      }
    </section>
  `,
  styles: `
    .sh-h { font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: #5f6b7a; margin: 1.75rem 0 .85rem; }
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
