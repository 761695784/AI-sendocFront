import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { I18nService } from './i18n.service';
import { FR } from './dictionaries/fr';
import { EN } from './dictionaries/en';
import { PT } from './dictionaries/pt';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.removeItem('doctrack-lang');
    TestBed.configureTestingModule({});
    service = TestBed.inject(I18nService);
  });

  it('affiche le français par défaut', () => {
    expect(service.lang()).toBe('fr');
    expect(service.t('nav.home')).toBe('Accueil');
  });

  it('passe en anglais puis en portugais, et mémorise le choix', async () => {
    await service.use('en');
    expect(service.t('nav.home')).toBe('Home');
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('en');

    await service.use('pt');
    expect(service.t('nav.home')).toBe('Início');
    expect(localStorage.getItem('doctrack-lang')).toBe('pt');
  });

  it('a les mêmes textes dans les trois langues', () => {
    const keys = Object.keys(FR).sort();
    expect(Object.keys(EN).sort()).toEqual(keys);
    expect(Object.keys(PT).sort()).toEqual(keys);
    for (const dict of [EN, PT]) {
      for (const key of keys) {
        expect(dict[key as keyof typeof FR].trim()).not.toBe('');
      }
    }
  });
});
