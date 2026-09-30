import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * En-tête de page : titre, sous-titre et boutons d'action à droite.
 *
 *   <app-page-header title="Correspondances" subtitle="À examiner aujourd'hui">
 *     <button class="btn btn-primary">Nouvelle</button>
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="dt-page-header">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <div class="dt-page-header__actions"><ng-content /></div>
    </header>
  `,
  styles: `
    .dt-page-header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
      gap: 1rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--dt-ink, #1c2430); }
    p { margin: .25rem 0 0; color: var(--dt-muted, #5f6b7a); }
    .dt-page-header__actions { display: flex; flex-wrap: wrap; gap: .5rem; }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
