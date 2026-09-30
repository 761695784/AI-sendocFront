import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { apiErrorMessage } from '../../core/api/api-v2.client';

const COLORS = { confirm: '#1d5b99', cancel: '#6c757d', danger: '#c0392b' };

/**
 * Messages à l'utilisateur (SweetAlert2), avec le même style partout.
 * Les nouveaux écrans passent par ce service plutôt que d'appeler Swal directement.
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  /** Petit message en haut à droite qui disparaît seul. */
  success(message: string): void {
    void Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: message, timer: 2500, showConfirmButton: false });
  }

  info(message: string, title = 'Information'): Promise<unknown> {
    return Swal.fire({ icon: 'info', title, text: message, confirmButtonColor: COLORS.confirm });
  }

  /** Erreur : accepte un texte ou une erreur HTTP de l'API (message de validation compris). */
  error(error: unknown, title = 'Action impossible'): Promise<unknown> {
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
      confirmButtonText: options.confirmText ?? 'Confirmer',
      cancelButtonText: 'Annuler',
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
      inputLabel: options.label ?? 'Motif',
      inputAttributes: { maxlength: '1000' },
      showCancelButton: true,
      confirmButtonText: options.confirmText ?? 'Confirmer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: options.danger ? COLORS.danger : COLORS.confirm,
      cancelButtonColor: COLORS.cancel,
      reverseButtons: true,
      inputValidator: (value) => (options.required && !value?.trim() ? 'Ce champ est obligatoire.' : null),
    });
    return result.isConfirmed ? String(result.value ?? '').trim() : null;
  }
}
