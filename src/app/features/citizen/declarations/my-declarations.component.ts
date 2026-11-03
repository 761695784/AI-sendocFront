import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CitizenApi } from '../../../core/api/citizen.api';
import { MyDeclaration, OwnerFoundDocument } from '../../../core/api/citizen.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { DeclarationService } from '../../../components/services/declaration.service';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { CitizenBadges } from '../citizen-badges.service';
import { openBlob } from '../../../shared/media/open-blob';

/**
 * Mes déclarations de perte, avec les documents retrouvés et la marche à suivre :
 * se présenter à la structure qui garde la pièce, ou demander la remise directe au trouveur.
 */
@Component({
  selector: 'app-my-declarations',
  imports: [DatePipe, RouterLink, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-declarations.component.html',
})
export class MyDeclarationsComponent implements OnInit {
  private readonly api = inject(CitizenApi);
  private readonly declarations = inject(DeclarationService);
  private readonly notify = inject(NotifyService);
  private readonly badges = inject(CitizenBadges);
  private readonly router = inject(Router);

  readonly items = signal<MyDeclaration[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.myDeclarations().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Impossible de charger vos déclarations.'));
        this.loading.set(false);
      },
    });
  }

  typeName(d: MyDeclaration): string {
    return d.document_type?.TypeName ?? d.Title ?? 'Document';
  }

  viewCertificate(d: MyDeclaration): void {
    if (d.certificat?.uuid) {
      this.declarations.viewCertificate(d.certificat.uuid);
    }
  }

  /** Ouvre le PDF d'un récépissé ou d'un certificat de perte. */
  openPdf(uuid: string, number: string): void {
    this.busy.set(uuid);
    this.api.certificatePdf(uuid).subscribe({
      next: (blob) => {
        this.busy.set(null);
        openBlob(blob, `${number}.pdf`);
      },
      error: (e) => {
        this.busy.set(null);
        void this.notify.error(e, 'Document indisponible');
      },
    });
  }

  /** Remise directe : le trouveur reçoit la demande par SMS et e-mail, sans votre numéro. */
  async askRestitution(doc: OwnerFoundDocument): Promise<void> {
    const ok = await this.notify.confirm({
      title: 'Demander la restitution ?',
      text:
        'Le trouveur recevra votre demande par SMS et par e-mail. Vos numéros ne seront échangés que s’il accepte. ' +
        'Rencontrez-vous dans un lieu public et ne payez jamais pour récupérer un document.',
      confirmText: 'Envoyer la demande',
    });
    if (!ok) {
      return;
    }
    this.busy.set(doc.uuid);
    this.api.askRestitution(doc.uuid).subscribe({
      next: (res) => {
        this.busy.set(null);
        void this.notify.info(res.message, 'Demande envoyée');
        this.badges.refresh();
        this.load();
      },
      error: (e) => {
        this.busy.set(null);
        void this.notify.error(e, 'Demande impossible');
        this.load();
      },
    });
  }

  goToRequests(): void {
    this.router.navigate(['/mon-espace/restitutions']);
  }
}
