import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Pagination des listes Laravel : <app-paginator [page]="result" (pageChange)="load($event)" />
 * où `result` contient current_page, last_page et total.
 */
@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (last() > 1) {
      <nav class="dt-paginator" aria-label="Pagination">
        <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="current() <= 1"
          (click)="pageChange.emit(current() - 1)">
          <i class="fas fa-chevron-left" aria-hidden="true"></i> Précédent
        </button>
        <span>Page {{ current() }} / {{ last() }} · {{ total() }} résultat{{ total() > 1 ? 's' : '' }}</span>
        <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="current() >= last()"
          (click)="pageChange.emit(current() + 1)">
          Suivant <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </nav>
    }
  `,
  styles: `
    .dt-paginator { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .75rem;
      margin-top: 1rem; color: #5f6b7a; font-size: .9rem; }
  `,
})
export class PaginatorComponent {
  readonly page = input<{ current_page?: number; last_page?: number; total?: number } | null>(null);
  readonly pageChange = output<number>();

  readonly current = computed(() => this.page()?.current_page ?? 1);
  readonly last = computed(() => this.page()?.last_page ?? 1);
  readonly total = computed(() => this.page()?.total ?? 0);
}
