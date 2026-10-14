import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * En-tête de page : pastille d'icône, titre, sous-titre et boutons d'action à droite.
 *
 *   <app-page-header title="Correspondances" subtitle="À examiner aujourd'hui" icon="fa-link">
 *     <button class="btn btn-primary">Nouvelle</button>
 *   </app-page-header>
 *
 * Sans `icon`, l'icône déclarée dans la route (data: { icon: 'fa-…' }) est utilisée, s'il y en a une.
 * Les couleurs suivent le thème de l'espace (variables --bo-* : violet et or dans l'administration).
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="dt-page-header">
      <div class="dt-page-header__main">
        @if (iconClass(); as i) {
          <span class="dt-page-header__icon" aria-hidden="true"><i class="fas {{ i }}"></i></span>
        }
        <div>
          <h1>{{ title() }}</h1>
          @if (subtitle()) {
            <p>{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="dt-page-header__actions"><ng-content /></div>
    </header>
  `,
  styles: `
    .dt-page-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 1rem; margin-bottom: 1.5rem; }
    .dt-page-header__main { display: flex; align-items: center; gap: 1rem; min-width: 0; }
    .dt-page-header__icon { flex-shrink: 0; width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center;
      background: var(--bo-ink, #13294b); color: var(--bo-accent, #f6a500); font-size: 20px; }
    h1 { font-size: var(--bo-h1-size, 1.5rem); font-weight: 700; margin: 0; color: var(--bo-ink, var(--dt-ink, #1c2430)); line-height: 1.25; }
    p { margin: .2rem 0 0; color: var(--bo-muted, var(--dt-muted, #5f6b7a)); font-size: .9rem; }
    .dt-page-header__actions { display: flex; flex-wrap: wrap; gap: .5rem; }
  `,
})
export class PageHeaderComponent {
  private readonly route = inject(ActivatedRoute, { optional: true });

  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly icon = input<string | null>(null);

  readonly iconClass = computed(() => this.icon() ?? (this.route?.snapshot.data['icon'] as string | undefined) ?? null);
}
