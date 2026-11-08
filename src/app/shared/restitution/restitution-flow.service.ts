import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { CitizenApi, RestitutionAskResponse } from '../../core/api/citizen.api';
import { I18nService } from '../../core/i18n/i18n.service';

const COLORS = { confirm: '#31287C', cancel: '#8a86a3' };

/** Fenêtres plus larges sur ordinateur (moins hautes), pleine largeur sur mobile. */
const Popup = Swal.mixin({ width: 'min(44rem, 94vw)' });

/** Fenêtre d'attente pendant l'envoi : elle est remplacée par la réponse (succès, erreur, vérification). */
function showSending(title: string, text: string): void {
  void Popup.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  });
}

/** Ce qu'il faut savoir du document pour choisir le bon parcours. */
export interface RestitutionTarget {
  uuid: string;
  reference?: string | null;
  found_channel?: string | null;
  custody?: { name: string; address?: string | null; phone?: string | null } | null;
}

/** Texte → HTML sûr (les valeurs viennent de l'API ou de l'utilisateur). */
function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/**
 * Demande de restitution, avec deux parcours :
 *  1. document publié par un citoyen → avertissement (DocTrack ne garantit pas la rencontre), acceptation,
 *     puis le numéro du trouveur s'affiche ; le trouveur reçoit le vôtre par SMS et e-mail ;
 *  2. document conservé par une structure (police, gendarmerie) → la structure est prévenue,
 *     vous allez le retirer au guichet avec une pièce d'identité (décharge de restitution).
 * Utilisé par la fiche du document et par « Mes déclarations ».
 */
@Injectable({ providedIn: 'root' })
export class RestitutionFlowService {
  private readonly api = inject(CitizenApi);
  private readonly i18n = inject(I18nService);

  /** Renvoie true si une demande a été enregistrée. */
  async ask(doc: RestitutionTarget): Promise<boolean> {
    const atStructure = !!doc.custody || doc.found_channel === 'counter';
    try {
      return await (atStructure ? this.askStructure(doc) : this.askFinder(doc));
    } finally {
      if (Swal.isLoading()) {
        Swal.close(); // filet de sécurité : jamais de fenêtre d'attente bloquée
      }
    }
  }

  // ── Cas 2 : la structure garde le document ─────────────────────────
  private async askStructure(doc: RestitutionTarget): Promise<boolean> {
    const t = this.i18n;
    const name = doc.custody?.name ?? t.t('rf.custody_fallback');
    const confirm = await Popup.fire({
      icon: 'info',
      title: t.t('rf.counter_title'),
      html: t.t('rf.counter_html', { name: esc(name) }),
      showCancelButton: true,
      confirmButtonText: t.t('rf.send_request'),
      cancelButtonText: t.t('rf.cancel'),
      confirmButtonColor: COLORS.confirm,
      cancelButtonColor: COLORS.cancel,
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) {
      return false;
    }
    const res = await this.call(doc.uuid, {});
    if (!res || 'identity_check' in res) {
      return false;
    }
    const c = res.custody;
    await Popup.fire({
      icon: 'success',
      title: t.t('rf.sent_title'),
      html: `<p>${esc(res.message)}</p>
        ${c ? `<div style="text-align:left;background:#f4f3fb;border-radius:12px;padding:12px 14px;margin-top:8px">
          <b>${esc(c.name)}</b>${c.address ? `<br>${esc(c.address)}` : ''}${c.phone ? `<br>${t.t('rf.phone_short')} <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : ''}
          ${res.reference ? `<br>${t.t('rf.reference')} : <b>${esc(res.reference)}</b>` : ''}</div>` : ''}`,
      confirmButtonColor: COLORS.confirm,
    });
    return true;
  }

  // ── Cas 1 : un citoyen a trouvé le document ────────────────────────
  private async askFinder(doc: RestitutionTarget): Promise<boolean> {
    const t = this.i18n;
    const form = await Popup.fire({
      icon: 'warning',
      title: t.t('rf.finder_title'),
      html: `
        <div style="text-align:left;font-size:.92rem;line-height:1.55">
          <p>${t.t('rf.finder_intro')}</p>
          <ul style="padding-left:1.1rem;margin:0 0 .6rem">
            <li>${t.t('rf.finder_li1')}</li>
            <li>${t.t('rf.finder_li2')}</li>
            <li>${t.t('rf.finder_li3')}</li>
          </ul>
          <label style="display:flex;gap:.5rem;align-items:flex-start;cursor:pointer">
            <input id="rs-terms" type="checkbox" style="margin-top:.3rem">
            <span>${t.t('rf.finder_terms')}</span>
          </label>
        </div>`,
      showCancelButton: true,
      confirmButtonText: t.t('rf.accept_continue'),
      cancelButtonText: t.t('rf.cancel'),
      confirmButtonColor: COLORS.confirm,
      cancelButtonColor: COLORS.cancel,
      reverseButtons: true,
      focusConfirm: false,
      preConfirm: () => {
        if (!(document.getElementById('rs-terms') as HTMLInputElement | null)?.checked) {
          Swal.showValidationMessage(t.t('rf.tick_terms'));
          return false;
        }
        return true;
      },
    });
    if (!form.isConfirmed) {
      return false;
    }
    return this.send(doc, { accept_terms: true });
  }

  /** Envoie la demande ; si l'identité n'est pas reconnue, propose les 4 caractères ou la vérification par le trouveur. */
  private async send(doc: RestitutionTarget, payload: Record<string, unknown>): Promise<boolean> {
    const res = await this.call(doc.uuid, payload, true);
    if (res && typeof res === 'object' && 'identity_check' in res) {
      return this.afterIdentityCheck(doc, res.has_number, false, res.locked);
    }
    if (!res) {
      return false;
    }
    const ok = res as RestitutionAskResponse;
    const t = this.i18n;
    if (ok.request?.status === 'pending') {
      await Popup.fire({
        icon: 'success',
        title: t.t('rf.sent_finder_title'),
        text: ok.message,
        confirmButtonColor: COLORS.confirm,
      });
      return true;
    }
    const f = ok.finder;
    await Popup.fire({
      icon: 'success',
      title: t.t('rf.contact_finder'),
      html: `
        ${f?.phone ? `<div style="background:#f4f3fb;border-radius:14px;padding:14px;margin-bottom:10px">
            <div style="font-size:.85rem;color:#5b5878">${esc(f.first_name ?? t.t('rf.the_finder'))}</div>
            <a href="tel:${esc(f.phone)}" style="font-size:1.45rem;font-weight:800;color:#31287C;text-decoration:none">${esc(f.phone)}</a>
          </div>` : ''}
        <p style="font-size:.9rem">${esc(ok.message)}</p>
        <p style="font-size:.85rem;color:#5b5878">${t.t('rf.after_contact')}</p>`,
      confirmButtonText: t.t('rf.understood'),
      confirmButtonColor: COLORS.confirm,
    });
    return true;
  }

  /**
   * Nom du compte différent de celui du document (deux noms de famille, nom d'épouse…) :
   * - si le trouveur a saisi le numéro : les 4 derniers caractères, ou « laisser le trouveur vérifier » ;
   * - sinon : la demande part au trouveur, qui compare avec le document et accepte ou refuse.
   */
  private async afterIdentityCheck(doc: RestitutionTarget, hasNumber: boolean, wrong = false, locked = false): Promise<boolean> {
    const t = this.i18n;
    const choice = await Popup.fire({
      icon: 'info',
      title: t.t('rf.check_title'),
      html: `<div style="text-align:left;font-size:.92rem;line-height:1.55">
        <p>${t.t('rf.check_intro')}</p>
        ${hasNumber ? `
          ${wrong ? `<p style="color:#c62828"><b>${t.t('rf.wrong_last4')}</b></p>` : ''}
          <label for="rs-last4" style="font-weight:700;font-size:.82rem;color:#4b4766">${t.t('rf.last4_label')}</label>
          <input id="rs-last4" class="swal2-input" style="margin:.35rem 0 .6rem;width:100%" maxlength="12" autocomplete="off" placeholder="0123">
          <p style="font-size:.85rem;color:#5b5878">${t.t('rf.last4_help')}</p>`
        : `<p>${locked ? `<b>${t.t('rf.too_many')}</b>` : t.t('rf.no_number')}
            ${t.t('rf.will_send')}</p>`}
      </div>`,
      showCancelButton: true,
      showDenyButton: hasNumber,
      confirmButtonText: hasNumber ? t.t('rf.verify') : t.t('rf.send_to_finder'),
      denyButtonText: t.t('rf.ask_finder'),
      cancelButtonText: t.t('rf.cancel'),
      confirmButtonColor: COLORS.confirm,
      denyButtonColor: '#F6A500',
      cancelButtonColor: COLORS.cancel,
      reverseButtons: true,
      focusConfirm: false,
      didOpen: () => (document.getElementById('rs-last4') as HTMLInputElement | null)?.focus(),
      preConfirm: () => {
        if (!hasNumber) {
          return '';
        }
        const value = ((document.getElementById('rs-last4') as HTMLInputElement | null)?.value ?? '').trim();
        if (value.replace(/[^A-Za-z0-9]/g, '').length < 4) {
          Swal.showValidationMessage(t.t('rf.min4'));
          return false;
        }
        return value;
      },
    });
    if (choice.isDenied || (choice.isConfirmed && !hasNumber)) {
      return this.send(doc, { accept_terms: true, ask_finder: true });
    }
    if (!choice.isConfirmed) {
      return false;
    }
    const res = await this.call(doc.uuid, { accept_terms: true, doc_last4: String(choice.value) }, true);
    if (res && typeof res === 'object' && 'identity_check' in res) {
      return this.afterIdentityCheck(doc, res.has_number, !res.locked, res.locked);
    }
    if (!res) {
      return false;
    }
    return this.showResult(res as RestitutionAskResponse);
  }

  /** Affiche le résultat d'une demande déjà envoyée (numéro du trouveur). */
  private async showResult(res: RestitutionAskResponse): Promise<boolean> {
    const f = res.finder;
    const t = this.i18n;
    await Popup.fire({
      icon: 'success',
      title: t.t('rf.contact_finder'),
      html: `
        ${f?.phone ? `<div style="background:#f4f3fb;border-radius:14px;padding:14px;margin-bottom:10px">
            <div style="font-size:.85rem;color:#5b5878">${esc(f.first_name ?? t.t('rf.the_finder'))}</div>
            <a href="tel:${esc(f.phone)}" style="font-size:1.45rem;font-weight:800;color:#31287C;text-decoration:none">${esc(f.phone)}</a>
          </div>` : ''}
        <p style="font-size:.9rem">${esc(res.message)}</p>`,
      confirmButtonText: t.t('rf.understood'),
      confirmButtonColor: COLORS.confirm,
    });
    return true;
  }

  /** Appel de l'API ; affiche l'erreur. Renvoie { identity_check } si l'API demande une vérification. */
  private async call(uuid: string, payload: Record<string, unknown>, identityRetry = false)
    : Promise<RestitutionAskResponse | { identity_check: true; has_number: boolean; locked: boolean } | null> {
    showSending(this.i18n.t('rf.sending_title'), this.i18n.t('rf.sending_text'));
    try {
      return await firstValueFrom(this.api.askRestitution(uuid, payload));
    } catch (e) {
      const err = e as HttpErrorResponse;
      if (identityRetry && err?.status === 403 && err.error?.code === 'identity_check') {
        return { identity_check: true, has_number: !!err.error?.has_number, locked: !!err.error?.locked };
      }
      const message: string = err?.error?.message
        || (err?.status === 429 ? this.i18n.t('rf.too_many_requests') : this.i18n.t('rf.not_sent'));
      await Popup.fire({
        icon: err?.status === 400 ? 'info' : 'error',
        title: err?.status === 400 ? this.i18n.t('rf.already') : this.i18n.t('rf.impossible'),
        text: message,
        confirmButtonColor: COLORS.confirm,
      });
      return null;
    }
  }
}
