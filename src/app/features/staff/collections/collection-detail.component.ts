import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CounterApi } from '../../../core/api/counter.api';
import { CollectionView } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent, statusLabel } from '../../../shared/ui/status-badge.component';
import { ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';

const OUTCOMES: Record<string, string> = { reached: 'Joint', no_answer: 'Pas de réponse', wrong_number: 'Numéro erroné' };
const REASONS: Record<string, string> = { gps: 'structure la plus proche (GPS)', department: 'même département', region: 'même région', transfer: 'transféré' };

/**
 * Fiche de retrait : numéro du trouveur (chaque consultation est tracée), appel, rendez-vous,
 * réception du document (il passe sous la garde de la structure), refus ou transfert, historique.
 */
@Component({
  selector: 'app-staff-collection-detail',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './collection-detail.component.html',
})
export class StaffCollectionDetailComponent implements OnInit {
  private readonly api = inject(CounterApi);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly uuid = input.required<string>();
  readonly c = signal<CollectionView | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly showPlan = signal(false);

  readonly outcomes = OUTCOMES;
  readonly statusLabel = statusLabel;
  readonly open = computed(() => ['assigned', 'contacted', 'planned', 'unassigned'].includes(this.c()?.status ?? ''));

  readonly plan = this.fb.nonNullable.group({
    method: ['drop_off' as 'drop_off' | 'agent_pickup', Validators.required],
    scheduled_at: [''],
    meeting_place: ['', Validators.maxLength(255)],
  });

  ngOnInit(): void {
    this.api.collection(this.uuid()).subscribe({
      next: (c) => {
        this.c.set(c);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Retrait introuvable.'));
        this.loading.set(false);
      },
    });
  }

  canManage(): boolean {
    return this.session.can('collections.manage');
  }

  reasonLabel(r: string | null): string {
    return r ? (REASONS[r] ?? r) : '';
  }

  async contact(outcome: 'reached' | 'no_answer' | 'wrong_number'): Promise<void> {
    const note = await this.notify.confirmWithNote({ title: `Appel : ${OUTCOMES[outcome]}`, label: 'Note (facultatif)', confirmText: 'Enregistrer' });
    if (note !== null) {
      this.run(this.api.recordContact(this.uuid(), outcome, note), 'Appel enregistré.');
    }
  }

  savePlan(): void {
    const v = this.plan.getRawValue();
    if (v.method === 'agent_pickup' && !v.scheduled_at) {
      void this.notify.error('Indiquez la date du passage de l’agent.');
      return;
    }
    this.run(
      this.api.planCollection(this.uuid(), {
        method: v.method,
        scheduled_at: v.scheduled_at ? new Date(v.scheduled_at).toISOString() : null,
        meeting_place: v.meeting_place.trim() || null,
      }),
      'Rendez-vous enregistré : le trouveur reçoit un SMS.',
      () => this.showPlan.set(false),
    );
  }

  async collected(): Promise<void> {
    const ok = await this.notify.confirm({
      title: 'Document reçu ?',
      text: 'Le document passe sous la garde de votre structure ; le trouveur est remercié par SMS et le propriétaire prévenu s’il est connu.',
      confirmText: 'Oui, document reçu',
    });
    if (ok) {
      this.run(this.api.markCollected(this.uuid()), 'Document pris en garde.');
    }
  }

  async decline(): Promise<void> {
    const reason = await this.notify.confirmWithNote({
      title: 'Refuser ce retrait ?',
      text: 'Le dossier part automatiquement à la structure suivante la plus proche.',
      label: 'Motif (obligatoire)',
      required: true,
      confirmText: 'Refuser',
      danger: true,
    });
    if (reason) {
      this.run(this.api.declineCollection(this.uuid(), reason), 'Retrait transmis à une autre structure.');
    }
  }

  async transfer(): Promise<void> {
    const q = await this.notify.prompt({ title: 'Transférer à une structure', label: 'Nom de la structure (recherche)', required: true, confirmText: 'Rechercher' });
    if (!q) {
      return;
    }
    this.api.organizations(q).subscribe({
      next: async (res) => {
        const list = (res.data ?? []).filter((o) => o.uuid !== this.c()?.organization?.uuid);
        if (!list.length) {
          void this.notify.error('Aucune structure trouvée (seules les structures de votre périmètre sont visibles).');
          return;
        }
        const target = list[0];
        const reason = await this.notify.confirmWithNote({
          title: `Transférer à ${target.name} ?`,
          text: list.length > 1 ? `${list.length} résultats : le premier est proposé. Affinez la recherche si besoin.` : undefined,
          label: 'Motif (obligatoire)',
          required: true,
          confirmText: 'Transférer',
        });
        if (reason) {
          this.run(this.api.transferCollection(this.uuid(), target.uuid, reason), `Transféré à ${target.name}.`);
        }
      },
      error: (e) => void this.notify.error(e),
    });
  }

  private run(call: Observable<CollectionView>, message: string, after?: () => void): void {
    this.busy.set(true);
    call.subscribe({
      next: (c) => {
        this.busy.set(false);
        this.c.set(c);
        this.notify.success(message);
        after?.();
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e);
      },
    });
  }
}
