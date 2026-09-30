import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';

/** Libellé français et couleur de chaque statut renvoyé par l'API. */
export const STATUS_LABELS: Record<string, [string, Tone]> = {
  // Documents trouvés (cycle de vie)
  published: ['Publié', 'info'],
  in_custody: ['En garde', 'primary'],
  matched: ['Correspondance', 'warning'],
  restitution_pending: ['Restitution en attente', 'warning'],
  restituted: ['Restitué', 'success'],
  archived: ['Archivé', 'neutral'],
  destroyed: ['Détruit', 'neutral'],
  // Déclarations
  registered: ['Enregistrée', 'info'],
  lost: ['Perdu', 'danger'],
  found: ['Retrouvé', 'success'],
  restitution_in_progress: ['Restitution en cours', 'warning'],
  replaced: ['Remplacée', 'neutral'],
  // Correspondances
  proposed: ['Proposée', 'warning'],
  pending_review: ['À examiner', 'warning'],
  confirmed: ['Confirmée', 'success'],
  rejected: ['Rejetée', 'danger'],
  superseded: ['Remplacée', 'neutral'],
  // Retraits
  unassigned: ['Non attribué', 'neutral'],
  assigned: ['Attribué', 'info'],
  contacted: ['Contacté', 'info'],
  planned: ['Planifié', 'primary'],
  collected: ['Récupéré', 'success'],
  handed_off: ['Transféré', 'info'],
  declined: ['Refusé', 'danger'],
  abandoned: ['Abandonné', 'neutral'],
  // Paiements / frais
  pending: ['En attente', 'warning'],
  pending_payment: ['Paiement attendu', 'warning'],
  initiated: ['Initié', 'info'],
  paid: ['Payé', 'success'],
  succeeded: ['Réussi', 'success'],
  failed: ['Échec', 'danger'],
  exempted: ['Exonéré', 'neutral'],
  waived_pilot: ['Gratuit (pilote)', 'neutral'],
  // Divers
  open: ['Ouverte', 'warning'],
  dismissed: ['Écartée', 'neutral'],
  closed: ['Clôturé', 'neutral'],
  completed: ['Terminé', 'success'],
  cancelled: ['Annulé', 'neutral'],
  voided: ['Annulée', 'danger'],
  accepted: ['Acceptée', 'success'],
  active: ['Actif', 'success'],
  suspended: ['Suspendu', 'danger'],
  revoked: ['Révoqué', 'danger'],
  expired: ['Expiré', 'neutral'],
  used: ['Utilisé', 'neutral'],
  sent: ['Envoyé', 'success'],
  skipped: ['Ignoré', 'neutral'],
};

export function statusLabel(status: string | null | undefined): string {
  return status ? (STATUS_LABELS[status]?.[0] ?? status) : '—';
}

/**
 * Pastille de statut : <app-status-badge [status]="declaration.status" />
 * Libellé forcé possible : [label]="'Urgent'" tone="danger".
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="dt-badge" [class]="'dt-badge dt-badge--' + tone()">{{ text() }}</span>`,
  styles: `
    .dt-badge { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .6rem; border-radius: 999px;
      font-size: .78rem; font-weight: 600; line-height: 1.4; white-space: nowrap; }
    .dt-badge--neutral { background: #eef0f3; color: #4a5361; }
    .dt-badge--info { background: #e5f0fb; color: #1d5b99; }
    .dt-badge--primary { background: #e8ecf8; color: #2c3e8c; }
    .dt-badge--success { background: #e3f4ea; color: #1e7044; }
    .dt-badge--warning { background: #fff3dc; color: #8a5a00; }
    .dt-badge--danger { background: #fde8e8; color: #a52a2a; }
  `,
})
export class StatusBadgeComponent {
  readonly status = input<string | null | undefined>(null);
  readonly label = input<string | null>(null);
  readonly toneOverride = input<Tone | null>(null, { alias: 'tone' });

  readonly text = computed(() => this.label() ?? statusLabel(this.status()));
  readonly tone = computed<Tone>(() => this.toneOverride() ?? STATUS_LABELS[this.status() ?? '']?.[1] ?? 'neutral');
}
