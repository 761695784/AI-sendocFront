import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface ColumnPoint {
  /** Libellé court affiché sous la colonne (ex. « S38 », « 12 sept. »). */
  label: string;
  /** Libellé complet pour l'infobulle et le tableau (ex. « Semaine 38 (2026) »). */
  title: string;
  value: number;
}

/** Arrondit le maximum de l'axe à une valeur « propre » (1, 2, 5 × 10^n). */
export function niceMax(max: number): number {
  if (max <= 0) {
    return 4;
  }
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  for (const step of [1, 2, 4, 8, 10]) {
    if (step * exp >= max) {
      return Math.max(4, step * exp);
    }
  }
  return 10 * exp;
}

/**
 * Histogramme en colonnes, une seule série (le titre de la carte la nomme : pas de légende).
 * Colonnes fines (≤ 24 px, bout arrondi), grille discrète, infobulle au survol ou au clavier,
 * et bascule « Voir en tableau » pour la lecture sans graphique.
 */
@Component({
  selector: 'app-column-chart',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cc__bar">
      <span class="cc__total">Total sur la période : <b>{{ total() | number }}</b></span>
      <button type="button" class="btn btn-link btn-sm p-0" (click)="asTable.set(!asTable())" [attr.aria-pressed]="asTable()">
        <i class="fas {{ asTable() ? 'fa-chart-bar' : 'fa-table' }} me-1" aria-hidden="true"></i>{{ asTable() ? 'Voir en graphique' : 'Voir en tableau' }}
      </button>
    </div>

    @if (asTable()) {
      <div class="table-responsive cc__table">
        <table class="table table-sm mb-0">
          <thead><tr><th scope="col">Période</th><th scope="col" class="text-end">{{ unit() }}</th></tr></thead>
          <tbody>
            @for (p of points(); track p.title) { <tr><td>{{ p.title }}</td><td class="text-end">{{ p.value | number }}</td></tr> }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="cc" role="group" [attr.aria-label]="ariaLabel()">
        <div class="cc__axis" aria-hidden="true">
          @for (t of ticks(); track t) { <span [style.bottom.%]="(t / max()) * 100">{{ t | number }}</span> }
        </div>
        <div class="cc__plot">
          @for (t of ticks(); track t) { <span class="cc__grid" [style.bottom.%]="(t / max()) * 100" aria-hidden="true"></span> }
          <div class="cc__cols">
            @for (p of points(); track p.title; let i = $index) {
              <button type="button" class="cc__slot" [attr.aria-label]="p.title + ' : ' + p.value" (mouseenter)="hover.set(i)" (mouseleave)="hover.set(null)"
                (focus)="hover.set(i)" (blur)="hover.set(null)">
                <span class="cc__col" [class.cc__col--zero]="p.value === 0" [style.height.%]="(p.value / max()) * 100"></span>
                @if (hover() === i) {
                  <span class="cc__tip" role="tooltip"><b>{{ p.value | number }}</b> {{ unit() }}<br /><small>{{ p.title }}</small></span>
                }
              </button>
            }
          </div>
        </div>
        <div class="cc__labels" aria-hidden="true">
          @for (p of points(); track p.title; let i = $index) { <span>{{ i % labelEvery() === 0 ? p.label : '' }}</span> }
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; --cc-series: #1d5b99; --cc-grid: #e7ebf0; --cc-ink: #5f6b7a; }
    .cc__bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; font-size: .88rem; color: var(--cc-ink); }
    .cc__total b { color: #13294b; }
    .cc { display: grid; grid-template-columns: 2.6rem 1fr; grid-template-rows: 200px auto; column-gap: .4rem; }
    .cc__axis { position: relative; font-size: .72rem; color: var(--cc-ink); }
    .cc__axis span { position: absolute; right: 0; transform: translateY(50%); line-height: 1; }
    .cc__plot { position: relative; border-bottom: 1px solid #c9d1db; }
    .cc__grid { position: absolute; left: 0; right: 0; border-top: 1px solid var(--cc-grid); }
    .cc__cols { position: absolute; inset: 0; display: flex; gap: 2px; align-items: stretch; }
    .cc__slot { position: relative; flex: 1; display: flex; align-items: flex-end; justify-content: center; background: none; border: 0; padding: 0; min-width: 0; cursor: default; }
    .cc__slot:hover, .cc__slot:focus-visible { background: rgba(29, 91, 153, .06); outline: none; }
    .cc__col { width: min(24px, 70%); background: var(--cc-series); border-radius: 4px 4px 0 0; min-height: 0; }
    .cc__col--zero { height: 0 !important; }
    .cc__tip { position: absolute; bottom: calc(100% - 2.5rem); left: 50%; transform: translate(-50%, -100%); z-index: 2; white-space: nowrap;
      background: #13294b; color: #fff; font-size: .78rem; padding: .35rem .55rem; border-radius: .4rem; pointer-events: none; text-align: center; }
    .cc__labels { grid-column: 2; display: flex; gap: 2px; font-size: .7rem; color: var(--cc-ink); padding-top: .3rem; }
    .cc__labels span { flex: 1; text-align: center; white-space: nowrap; overflow: visible; min-width: 0; }
    .cc__table { max-height: 260px; overflow-y: auto; }
    @media (prefers-color-scheme: dark) { :host { --cc-series: #6ea8e6; } }
  `,
})
export class ColumnChartComponent {
  readonly points = input<ColumnPoint[]>([]);
  /** Unité lue dans l'infobulle et l'en-tête du tableau (ex. « déclarations »). */
  readonly unit = input('valeur');

  readonly hover = signal<number | null>(null);
  readonly asTable = signal(false);

  readonly total = computed(() => this.points().reduce((s, p) => s + p.value, 0));
  readonly max = computed(() => niceMax(Math.max(0, ...this.points().map((p) => p.value))));
  readonly ticks = computed(() => {
    const m = this.max();
    return [0, m / 4, m / 2, (3 * m) / 4, m].filter((t) => Number.isInteger(t));
  });
  /** Un libellé sur n pour éviter qu'ils se chevauchent (≈ 12 libellés au plus). */
  readonly labelEvery = computed(() => Math.max(1, Math.ceil(this.points().length / 12)));
  readonly ariaLabel = computed(() => {
    const pts = this.points();
    if (!pts.length) {
      return 'Aucune donnée';
    }
    const peak = pts.reduce((a, b) => (b.value > a.value ? b : a));
    return `${pts.length} périodes, total ${this.total()} ${this.unit()}, maximum ${peak.value} (${peak.title}).`;
  });
}
