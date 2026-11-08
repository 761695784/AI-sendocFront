import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateFrPipe } from '../../core/i18n/translate.pipe';

/** Indicateur de chargement : <app-loading /> ou <app-loading label="Lecture de la pièce…" />. */
@Component({
  selector: 'app-loading',
  imports: [TranslateFrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dt-state" role="status" aria-live="polite">
      <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      <span>{{ label() | tfr }}</span>
    </div>
  `,
  styles: `.dt-state { display: flex; align-items: center; justify-content: center; gap: .6rem; padding: 2rem 1rem; color: #5f6b7a; }`,
})
export class LoadingComponent {
  readonly label = input('Chargement…');
}

/** Liste vide : <app-empty-state title="Aucune correspondance" text="…" icon="fa-link" />. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dt-empty">
      <i class="fas {{ icon() }}" aria-hidden="true"></i>
      <strong>{{ title() }}</strong>
      @if (text()) {
        <p>{{ text() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .dt-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: .4rem;
      padding: 2.5rem 1rem; color: #5f6b7a; }
    .dt-empty i { font-size: 2rem; color: var(--bo-empty-icon, #b5bdc8); margin-bottom: .25rem; }
    .dt-empty strong { color: var(--bo-ink, #1c2430); }
    .dt-empty p { margin: 0; max-width: 32rem; }
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly text = input<string | null>(null);
  readonly icon = input('fa-inbox');
}

/** Message d'erreur avec bouton « Réessayer » : <app-error-state [message]="err" (retry)="load()" />. */
@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2" role="alert">
      <span><i class="fas fa-exclamation-triangle me-2" aria-hidden="true"></i>{{ message() }}</span>
      <ng-content />
    </div>
  `,
})
export class ErrorStateComponent {
  readonly message = input.required<string>();
}
