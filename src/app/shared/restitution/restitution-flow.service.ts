import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { CitizenApi, RestitutionAskResponse } from '../../core/api/citizen.api';

const COLORS = { confirm: '#31287C', cancel: '#8a86a3' };

/** Fenêtres plus larges sur ordinateur (moins hautes), pleine largeur sur mobile. */
const Popup = Swal.mixin({ width: 'min(44rem, 94vw)' });

/** Fenêtre d'attente pendant l'envoi : elle est remplacée par la réponse (succès, erreur, vérification). */
function showSending(): void {
  void Popup.fire({
    title: 'Envoi de votre demande…',
    text: 'Merci de patienter quelques secondes.',
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
    const name = doc.custody?.name ?? 'la structure qui conserve ce document';
    const confirm = await Popup.fire({
      icon: 'info',
      title: 'Retirer le document au guichet',
      html: `<p>Ce document est conservé par <b>${esc(name)}</b>.</p>
             <p>Votre demande lui sera transmise (message, e-mail et SMS). Présentez-vous ensuite avec une
             <b>pièce d'identité</b> : l'agent vérifie votre identité et vous remet le document contre une décharge.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Envoyer ma demande',
      cancelButtonText: 'Annuler',
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
      title: 'Demande transmise',
      html: `<p>${esc(res.message)}</p>
        ${c ? `<div style="text-align:left;background:#f4f3fb;border-radius:12px;padding:12px 14px;margin-top:8px">
          <b>${esc(c.name)}</b>${c.address ? `<br>${esc(c.address)}` : ''}${c.phone ? `<br>Tél. <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : ''}
          ${res.reference ? `<br>Référence : <b>${esc(res.reference)}</b>` : ''}</div>` : ''}`,
      confirmButtonColor: COLORS.confirm,
    });
    return true;
  }

  // ── Cas 1 : un citoyen a trouvé le document ────────────────────────
  private async askFinder(doc: RestitutionTarget): Promise<boolean> {
    const form = await Popup.fire({
      icon: 'warning',
      title: 'Avant de contacter le trouveur',
      html: `
        <div style="text-align:left;font-size:.92rem;line-height:1.55">
          <p>Le trouveur recevra votre numéro par SMS et par e-mail, et son numéro s'affichera ici.</p>
          <ul style="padding-left:1.1rem;margin:0 0 .6rem">
            <li>DocTrack <b>ne garantit pas la sécurité de la rencontre</b> : vous y allez de votre propre consentement et sous votre responsabilité.</li>
            <li>Rencontrez-vous dans un <b>lieu public et fréquenté</b>, de préférence en journée, idéalement accompagné.</li>
            <li>Vous n'avez <b>rien à payer</b>. Si le trouveur vous demande de l'argent, DocTrack n'en est pas responsable : vous pouvez refuser et passer par le commissariat ou la brigade la plus proche.</li>
          </ul>
          <label style="display:flex;gap:.5rem;align-items:flex-start;cursor:pointer">
            <input id="rs-terms" type="checkbox" style="margin-top:.3rem">
            <span>J'ai lu ces conditions. J'accepte que DocTrack ne soit pas responsable de la rencontre ni de ce qui s'y passe.</span>
          </label>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'J’accepte et je continue',
      cancelButtonText: 'Annuler',
      confirmButtonColor: COLORS.confirm,
      cancelButtonColor: COLORS.cancel,
      reverseButtons: true,
      focusConfirm: false,
      preConfirm: () => {
        if (!(document.getElementById('rs-terms') as HTMLInputElement | null)?.checked) {
          Swal.showValidationMessage('Cochez la case pour accepter les conditions.');
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
    if (ok.request?.status === 'pending') {
      await Popup.fire({
        icon: 'success',
        title: 'Demande envoyée au trouveur',
        text: ok.message,
        confirmButtonColor: COLORS.confirm,
      });
      return true;
    }
    const f = ok.finder;
    await Popup.fire({
      icon: 'success',
      title: 'Contactez le trouveur',
      html: `
        ${f?.phone ? `<div style="background:#f4f3fb;border-radius:14px;padding:14px;margin-bottom:10px">
            <div style="font-size:.85rem;color:#5b5878">${esc(f.first_name ?? 'Le trouveur')}</div>
            <a href="tel:${esc(f.phone)}" style="font-size:1.45rem;font-weight:800;color:#31287C;text-decoration:none">${esc(f.phone)}</a>
          </div>` : ''}
        <p style="font-size:.9rem">${esc(ok.message)}</p>
        <p style="font-size:.85rem;color:#5b5878">Lieu public, rien à payer. Une fois le document remis, le trouveur le marquera « récupéré ».
        Vous retrouvez ce numéro dans <b>Mon espace → Remises</b>.</p>`,
      confirmButtonText: 'Compris',
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
    const choice = await Popup.fire({
      icon: 'info',
      title: 'Vérifions que c’est votre document',
      html: `<div style="text-align:left;font-size:.92rem;line-height:1.55">
        <p>Le nom de votre compte est différent de celui inscrit sur le document (deux noms de famille, nom d'épouse, faute de frappe…).</p>
        ${hasNumber ? `
          ${wrong ? '<p style="color:#c62828"><b>Ces 4 caractères ne correspondent pas.</b></p>' : ''}
          <label for="rs-last4" style="font-weight:700;font-size:.82rem;color:#4b4766">4 derniers caractères du numéro de la pièce</label>
          <input id="rs-last4" class="swal2-input" style="margin:.35rem 0 .6rem;width:100%" maxlength="12" autocomplete="off" placeholder="Ex. 0123">
          <p style="font-size:.85rem;color:#5b5878">Vous ne le connaissez pas ? Envoyez la demande au trouveur : il compare avec le document qu'il a en main et accepte ou refuse.</p>`
        : `<p>${locked ? '<b>Trop d’essais pour les 4 caractères du numéro.</b>' : 'Le trouveur n\'a pas saisi le numéro de la pièce.'}
            Votre demande lui sera envoyée avec votre nom : il compare avec le document
            qu'il a en main et accepte ou refuse. S'il accepte, vous recevez son numéro par SMS.</p>`}
      </div>`,
      showCancelButton: true,
      showDenyButton: hasNumber,
      confirmButtonText: hasNumber ? 'Vérifier' : 'Envoyer ma demande au trouveur',
      denyButtonText: 'Demander au trouveur',
      cancelButtonText: 'Annuler',
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
          Swal.showValidationMessage('Indiquez au moins 4 caractères.');
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
    await Popup.fire({
      icon: 'success',
      title: 'Contactez le trouveur',
      html: `
        ${f?.phone ? `<div style="background:#f4f3fb;border-radius:14px;padding:14px;margin-bottom:10px">
            <div style="font-size:.85rem;color:#5b5878">${esc(f.first_name ?? 'Le trouveur')}</div>
            <a href="tel:${esc(f.phone)}" style="font-size:1.45rem;font-weight:800;color:#31287C;text-decoration:none">${esc(f.phone)}</a>
          </div>` : ''}
        <p style="font-size:.9rem">${esc(res.message)}</p>`,
      confirmButtonText: 'Compris',
      confirmButtonColor: COLORS.confirm,
    });
    return true;
  }

  /** Appel de l'API ; affiche l'erreur. Renvoie { identity_check } si l'API demande une vérification. */
  private async call(uuid: string, payload: Record<string, unknown>, identityRetry = false)
    : Promise<RestitutionAskResponse | { identity_check: true; has_number: boolean; locked: boolean } | null> {
    showSending();
    try {
      return await firstValueFrom(this.api.askRestitution(uuid, payload));
    } catch (e) {
      const err = e as HttpErrorResponse;
      if (identityRetry && err?.status === 403 && err.error?.code === 'identity_check') {
        return { identity_check: true, has_number: !!err.error?.has_number, locked: !!err.error?.locked };
      }
      const message: string = err?.error?.message
        || (err?.status === 429 ? 'Trop de demandes. Réessayez un peu plus tard.' : 'La demande n’a pas pu être envoyée. Réessayez plus tard.');
      await Popup.fire({
        icon: err?.status === 400 ? 'info' : 'error',
        title: err?.status === 400 ? 'Demande déjà en cours' : 'Demande impossible',
        text: message,
        confirmButtonColor: COLORS.confirm,
      });
      return null;
    }
  }
}
