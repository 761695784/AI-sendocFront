import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import { TKey } from './dictionaries/fr';

/**
 * {{ 'nav.home' | t }} — texte dans la langue choisie.
 * Non « pur » : il se réévalue quand la langue change, sans recharger la page.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: TKey, params?: Record<string, string | number | null | undefined>): string {
    return this.i18n.t(key, params);
  }
}

/**
 * {{ libelleFrancais | tfr }} — traduit un libellé français venu du code (statuts, messages préparés en TS).
 * Le texte doit exister mot pour mot dans dictionaries/fr.ts.
 */
@Pipe({ name: 'tfr', pure: false })
export class TranslateFrPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(text: string | null | undefined): string {
    return this.i18n.fromFr(text);
  }
}
