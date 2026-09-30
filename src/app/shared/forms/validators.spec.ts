import { FormControl } from '@angular/forms';
import { normalizeSenegalPhone, personNameValidator, senegalPhoneValidator } from './validators';

describe('Validateurs', () => {
  it('numéros sénégalais', () => {
    expect(normalizeSenegalPhone('77 123 45 67')).toBe('771234567');
    expect(normalizeSenegalPhone('+221 78-444-55-66')).toBe('784445566');
    expect(normalizeSenegalPhone('00221338210000')).toBe('338210000');
    expect(normalizeSenegalPhone('12345')).toBeNull();
    expect(senegalPhoneValidator(new FormControl('70 000 00 0'))).toEqual({ phone: true });
    expect(senegalPhoneValidator(new FormControl(''))).toBeNull();
  });

  it('noms avec accents, traits d’union et apostrophes', () => {
    for (const ok of ['Aïssatou', 'Ndèye Fatou', 'Ba-Diallo', "N'Diaye"]) {
      expect(personNameValidator(new FormControl(ok))).toBeNull();
    }
    expect(personNameValidator(new FormControl('Awa2'))).toEqual({ personName: true });
  });
});
