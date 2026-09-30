import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CitizenApi } from '../../../core/api/citizen.api';
import { RestitutionRequestView } from '../../../core/api/citizen.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { CitizenBadges } from '../citizen-badges.service';

const LABELS: Record<string, string> = {
  pending: 'En attente de réponse',
  accepted: 'Acceptée',
  declined: 'Refusée',
  expired: 'Sans réponse',
  completed: 'Remise faite',
  cancelled: 'Retirée',
};

/**
 * Remises directes entre citoyens (double accord) :
 *  - propriétaire : suivre ou retirer sa demande ;
 *  - trouveur : accepter (échange des numéros par SMS) ou refuser (une structure prend le relais).
 */
@Component({
  selector: 'app-my-restitutions',
  imports: [DatePipe, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-restitutions.component.html',
})
export class MyRestitutionsComponent implements OnInit {
  private readonly api = inject(CitizenApi);
  private readonly notify = inject(NotifyService);
  private readonly badges = inject(CitizenBadges);

  readonly items = signal<RestitutionRequestView[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal<string | null>(null);

  readonly received = computed(() => this.items().filter((r) => r.my_role === 'finder'));
  readonly sent = computed(() => this.items().filter((r) => r.my_role === 'owner'));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.restitutionRequests().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Impossible de charger vos demandes.'));
        this.loading.set(false);
      },
    });
  }

  label(status: string): string {
    return LABELS[status] ?? status;
  }

  async accept(r: RestitutionRequestView): Promise<void> {
    const ok = await this.notify.confirm({
      title: 'Accepter d’être contacté ?',
      text: `${r.other_party.first_name ?? 'Le propriétaire'} recevra votre numéro et vous recevrez le sien par SMS. Rencontrez-vous dans un lieu public.`,
      confirmText: 'J’accepte',
    });
    if (ok) {
      this.run(r, this.api.acceptRestitution(r.uuid));
    }
  }

  async decline(r: RestitutionRequestView): Promise<void> {
    const reason = await this.notify.confirmWithNote({
      title: 'Refuser la remise directe ?',
      text: 'La structure officielle la plus proche récupérera le document auprès de vous.',
      label: 'Motif (facultatif)',
      confirmText: 'Refuser',
      danger: true,
    });
    if (reason !== null) {
      this.run(r, this.api.declineRestitution(r.uuid, reason));
    }
  }

  async cancel(r: RestitutionRequestView): Promise<void> {
    const ok = await this.notify.confirm({ title: 'Retirer votre demande ?', confirmText: 'Retirer', danger: true });
    if (ok) {
      this.run(r, this.api.cancelRestitution(r.uuid));
    }
  }

  private run(r: RestitutionRequestView, call: ReturnType<CitizenApi['cancelRestitution']>): void {
    this.busy.set(r.uuid);
    call.subscribe({
      next: (res) => {
        this.busy.set(null);
        this.notify.success(res.message);
        this.badges.refresh();
        this.load();
      },
      error: (e) => {
        this.busy.set(null);
        void this.notify.error(e);
        this.load();
      },
    });
  }
}
