import { apiErrorMessage, toFormData, toParams } from './api-v2.client';
import { apiV2 } from '../http/api-url';
import { environment } from '../../../environments/environment';

describe('Outils de l’API V2', () => {
  it('construit les adresses en encodant les segments', () => {
    expect(apiV2('matches', 'a b', 'confirm')).toBe(`${environment.apiUrl}/v2/matches/a%20b/confirm`);
  });

  it('ignore les paramètres vides', () => {
    const params = toParams({ status: '', page: 2, q: null, open: true, from: undefined });
    expect(params.keys()).toEqual(['page', 'open']);
    expect(params.get('open')).toBe('true');
  });

  it('transforme un objet imbriqué en FormData façon Laravel', () => {
    const photo = new Blob(['x'], { type: 'image/jpeg' });
    const form = toFormData({
      citizen: { first_name: 'Awa', phone: '771234567' },
      items: [{ document_type_id: 1, doc_number: '123' }],
      proxy: false,
      image: photo,
      note: null,
    });

    expect(form.get('citizen[first_name]')).toBe('Awa');
    expect(form.get('items[0][document_type_id]')).toBe('1');
    expect(form.get('proxy')).toBe('0');
    expect(form.get('image')).toBeInstanceOf(Blob);
    expect(form.has('note')).toBe(false);
  });

  it('extrait un message lisible des erreurs', () => {
    expect(apiErrorMessage({ status: 0 })).toContain('Impossible de joindre le serveur');
    expect(apiErrorMessage({ status: 422, error: { message: 'Données invalides', errors: { phone: ['Le téléphone est obligatoire.'] } } }))
      .toBe('Le téléphone est obligatoire.');
    expect(apiErrorMessage({ status: 409, error: { message: 'Déjà traitée.' } })).toBe('Déjà traitée.');
    expect(apiErrorMessage({}, 'Par défaut')).toBe('Par défaut');
  });
});
