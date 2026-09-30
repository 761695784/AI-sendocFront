import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Numéro sénégalais : 77 123 45 67, +221 77…, 00221 77… (mobiles 70/75/76/77/78, fixes 33). */
export function normalizeSenegalPhone(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  let digits = value.replace(/[^0-9+]/g, '');
  digits = digits.replace(/^00221/, '').replace(/^\+221/, '');
  return /^(7[05678]|3[03])\d{7}$/.test(digits) ? digits : null;
}

export const senegalPhoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value ?? '').toString().trim();
  return !value || normalizeSenegalPhone(value) ? null : { phone: true };
};

/** Noms et prénoms : lettres (accents compris), espaces, trait d'union, apostrophe. */
export const personNameValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value ?? '').toString().trim();
  return !value || /^[\p{L}][\p{L}\s'’-]*$/u.test(value) ? null : { personName: true };
};

/** Message d'erreur en français pour un champ de formulaire. */
export function fieldError(control: AbstractControl | null, label = 'Ce champ'): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) {
    return null;
  }
  const e = control.errors;
  if (e['required']) return `${label} est obligatoire.`;
  if (e['minlength']) return `${label} doit contenir au moins ${e['minlength'].requiredLength} caractères.`;
  if (e['maxlength']) return `${label} ne doit pas dépasser ${e['maxlength'].requiredLength} caractères.`;
  if (e['phone']) return 'Numéro invalide (ex. 77 123 45 67).';
  if (e['personName']) return 'Lettres uniquement (accents, espaces et traits d’union acceptés).';
  if (e['email']) return 'Adresse e-mail invalide.';
  if (e['server']) return e['server'];
  return `${label} est invalide.`;
}
