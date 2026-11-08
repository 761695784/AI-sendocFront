import { I18nService } from '../../core/i18n/i18n.service';
import { Injectable, inject } from '@angular/core';
import Swal from 'sweetalert2';
import { apiErrorMessage } from '../../core/api/api-v2.client';

/** Couleurs de la marque : violet pour confirmer, gris pour annuler, rouge pour les actions destructrices. */
const COLORS = { confirm: '#31287C', cancel: '#8a86a3', danger: '#c62828' };

/**
 * Messages à l'utilisateur (SweetAlert2), avec le même style partout.
 * Les nouveaux écrans passent par ce service plutôt que d'appeler Swal directement.
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly i18n = inject(I18nService);
  /** Petit message en haut à droite qui disparaît seul. */
  success(message: string): void {
    void Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: message, timer: 2500, showConfirmButton: false });
  }

  info(message: string, title = this.i18n.t('notify.information')): Promise<unknown> {
    return Swal.fire({ icon: 'info', title, text: message, confirmButtonColor: COLORS.confirm });
  }

  /** Erreur : accepte un texte ou une erreur HTTP de l'API (message de validation compris). */
  error(error: unknown, title = this.i18n.t('notify.action_impossible')): Promise<unknown> {
    const text = typeof error === 'string' ? error : apiErrorMessage(error);
    return Swal.fire({ icon: 'error', title, text, confirmButtonColor: COLORS.confirm });
  }

  /** Demande de confirmation. Renvoie true si l'utilisateur confirme. */
  async confirm(options: { title: string; text?: string; confirmText?: string; danger?: boolean }): Promise<boolean> {
    const result = await Swal.fire({
      icon: options.danger ? 'warning' : 'question',
      title: options.title,
      text: options.text,
      showCancelButton: true,
      confirmButtonText: options.confirmText ?? this.i18n.t('notify.confirmer'),
      cancelButtonText: this.i18n.t('rf.cancel'),
      confirmButtonColor: options.danger ? COLORS.danger : COLORS.confirm,
      cancelButtonColor: COLORS.cancel,
      reverseButtons: true,
    });
    return result.isConfirmed;
  }

  /**
   * Confirmation avec un motif écrit (obligatoire ou non).
   * Renvoie le texte saisi, ou null si l'utilisateur annule.
   */
  async confirmWithNote(options: {
    title: string;
    text?: string;
    label?: string;
    required?: boolean;
    confirmText?: string;
    danger?: boolean;
  }): Promise<string | null> {
    const result = await Swal.fire({
      icon: options.danger ? 'warning' : 'question',
      title: options.title,
      text: options.text,
      input: 'textarea',
      inputLabel: options.label ?? this.i18n.t('verify.motif'),
      inputAttributes: { maxlength: '1000' },
      showCancelButton: true,
      confirmButtonText: options.confirmText ?? this.i18n.t('notify.confirmer'),
      cancelButtonText: this.i18n.t('rf.cancel'),
      confirmButtonColor: options.danger ? COLORS.danger : COLORS.confirm,
      cancelButtonColor: COLORS.cancel,
      reverseButtons: true,
      inputValidator: (value) => (options.required && !value?.trim() ? this.i18n.t('notify.ce_champ_est_obligatoire') : null),
    });
    return result.isConfirmed ? String(result.value ?? '').trim() : null;
  }

  /** Saisie d'une valeur (montant, téléphone…). Renvoie la valeur, ou null si annulé. */
  async prompt(options: {
    title: string;
    text?: string;
    label?: string;
    input?: 'text' | 'number' | 'tel';
    value?: string;
    placeholder?: string;
    required?: boolean;
    confirmText?: string;
  }): Promise<string | null> {
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      input: options.input ?? 'text',
      inputLabel: options.label,
      inputValue: options.value ?? '',
      inputPlaceholder: options.placeholder,
      showCancelButton: true,
      confirmButtonText: options.confirmText ?? this.i18n.t('notify.valider'),
      cancelButtonText: this.i18n.t('rf.cancel'),
      confirmButtonColor: COLORS.confirm,
      cancelButtonColor: COLORS.cancel,
      reverseButtons: true,
      inputValidator: (value: unknown) => (options.required && !String(value ?? '').trim() ? this.i18n.t('notify.ce_champ_est_obligatoire') : null),
    });
    return result.isConfirmed ? String(result.value ?? '').trim() : null;
  }
}
