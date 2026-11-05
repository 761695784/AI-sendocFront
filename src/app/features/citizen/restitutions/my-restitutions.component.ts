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
  pending: 'En attente',
  accepted: 'En contact',
  declined: 'Passe par une structure',
  expired: 'Sans réponse',
  completed: 'Remise faite',
  cancelled: 'Retirée',
};

/**
 * Remises de documents :
 *  - entre citoyens : numéros échangés dès la demande ; le trouveur indique « document remis »
 *    (ou préfère passer par une structure) ;
 *  - au guichet : la structure qui conserve le document est prévenue ; la personne s'y présente.
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

  label(r: RestitutionRequestView): string {
    if (r.channel === 'counter') {
      return r.status === 'pending' ? 'Structure prévenue' : r.status === 'completed' ? 'Remis au guichet' : LABELS[r.status] ?? r.status;
    }
    return LABELS[r.status] ?? r.status;
  }

  /** Trouveur : le document a été remis à son propriétaire (la publication passe « récupéré »). */
  async handedOver(r: RestitutionRequestView): Promise<void> {
    if (!r.document?.uuid) {
      return;
    }
    const ok = await this.notify.confirm({
      title: 'Le document a été remis ?',
      text: 'Votre publication sera marquée « récupéré » et la demande close. Merci pour votre geste !',
      confirmText: 'Oui, il est remis',
    });
    if (ok) {
      this.run(r, this.api.markHandedOver(r.document.uuid) as ReturnType<CitizenApi['cancelRestitution']>, 'Merci ! La remise est enregistrée.');
    }
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
      title: 'Passer par une structure ?',
      text: 'Vous ne remettez pas le document vous-même : la structure de police ou de gendarmerie la plus proche le récupérera auprès de vous, et le propriétaire sera prévenu.',
      label: 'Motif (facultatif)',
      confirmText: 'Passer par une structure',
      danger: false,
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

  private run(r: RestitutionRequestView, call: ReturnType<CitizenApi['cancelRestitution']>, fallback = 'C’est fait.'): void {
    this.busy.set(r.uuid);
    call.subscribe({
      next: (res) => {
        this.busy.set(null);
        this.notify.success(res?.message || fallback);
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
