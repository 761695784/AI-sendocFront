import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface BarItem {
  label: string;
  value: number;
}

/**
 * Classement en barres horizontales (ex. publications par type de document).
 * Lisible sans légende : libellé, barre proportionnelle et valeur sur la même ligne.
 *
 *   <app-bar-list [items]="[{ label: 'Passeport', value: 12 }]" empty="Aucune publication" />
 */
@Component({
  selector: 'app-bar-list',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length) {
      <ul class="bl" role="list">
        @for (r of rows(); track r.label; let i = $index) {
          <li class="bl__row">
            <span class="bl__label" [title]="r.label">{{ r.label }}</span>
            <span class="bl__track" aria-hidden="true"><span class="bl__bar" [class.bl__bar--alt]="i % 2 === 1" [style.width.%]="r.pct"></span></span>
            <span class="bl__value">{{ r.value | number }}</span>
          </li>
        }
      </ul>
    } @else {
      <p class="bl__empty">{{ empty() }}</p>
    }
  `,
  styles: `
    .bl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    .bl__row { display: grid; grid-template-columns: minmax(110px, 38%) 1fr auto; align-items: center; gap: 12px; }
    .bl__label { font-size: 13px; font-weight: 600; color: var(--bo-ink, #1c2430); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bl__track { height: 12px; border-radius: 999px; background: var(--bo-soft, #eef0f3); overflow: hidden; }
    .bl__bar { display: block; height: 100%; min-width: 4px; border-radius: 999px; background: var(--bo-ink, #31287c); }
    .bl__bar--alt { background: var(--bo-accent, #f6a500); }
    .bl__value { min-width: 2.5rem; text-align: right; font-size: 14px; font-weight: 800; color: var(--bo-ink, #1c2430); font-variant-numeric: tabular-nums; }
    .bl__empty { margin: 0; padding: 1.5rem 0; text-align: center; color: var(--bo-muted, #5f6b7a); font-size: .9rem; }
  `,
})
export class BarListComponent {
  readonly items = input<BarItem[]>([]);
  readonly empty = input('Aucune donnée');
  /** Nombre maximal de lignes affichées (les plus grandes valeurs). */
  readonly limit = input(8);

  readonly rows = computed(() => {
    const sorted = [...this.items()].filter((i) => i.value > 0).sort((a, b) => b.value - a.value).slice(0, this.limit());
    const max = Math.max(1, ...sorted.map((i) => i.value));
    return sorted.map((i) => ({ ...i, pct: Math.round((i.value / max) * 100) }));
  });
}
