import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService, LANGUAGES } from './i18n.service';
import { TranslatePipe } from './translate.pipe';

/** Sélecteur de langue FR · EN · PT (en-tête, menu mobile). */
@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lang-switch" [class.lang-switch--block]="block()" role="group" [attr.aria-label]="'lang.label' | t">
      @for (l of languages; track l.code) {
        <button type="button" [class.active]="i18n.lang() === l.code" [attr.aria-pressed]="i18n.lang() === l.code"
          [attr.lang]="l.code" [title]="l.label" (click)="i18n.use(l.code)">{{ l.short }}</button>
      }
    </div>
  `,
  styles: [`
    .lang-switch { display: inline-flex; border: 1px solid #d9d5f0; border-radius: 999px; padding: 2px; background: #fff; gap: 2px; }
    .lang-switch button { border: 0; background: transparent; color: #31287C; font: 600 .75rem 'Poppins', sans-serif;
      padding: .3rem .55rem; border-radius: 999px; cursor: pointer; line-height: 1; }
    .lang-switch button:hover { background: #f0eeff; }
    .lang-switch button.active { background: #31287C; color: #fff; }
    .lang-switch--block { display: flex; width: max-content; margin: .5rem 0; }
    .lang-switch--block button { padding: .45rem .8rem; font-size: .85rem; }
  `],
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(I18nService);
  readonly languages = LANGUAGES;
  /** Version plus grande, pour le menu mobile. */
  readonly block = input(false);
}
