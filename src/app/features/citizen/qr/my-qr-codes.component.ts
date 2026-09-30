import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CitizenApi } from '../../../core/api/citizen.api';
import { DocTypeRef, DocumentTagView } from '../../../core/api/citizen.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { fieldError } from '../../../shared/forms/validators';
import { CitizenBadges } from '../citizen-badges.service';

/**
 * QR codes à coller sur ses documents : si quelqu'un trouve la pièce et scanne le QR,
 * le propriétaire est prévenu immédiatement, sans qu'aucune donnée personnelle ne soit visible.
 */
@Component({
  selector: 'app-my-qr-codes',
  imports: [DatePipe, ReactiveFormsModule, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-qr-codes.component.html',
  styles: `
    .qr-box { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 1rem; border: 1px dashed #c8c3ea; border-radius: .8rem; background: #fff; }
    .qr-box img { width: 180px; height: 180px; }
    .qr-box small { text-align: center; }
    @media print {
      .qr-print-hide { display: none !important; }
      .qr-box { border: 1px solid #000; page-break-inside: avoid; }
    }
  `,
})
export class MyQrCodesComponent implements OnInit {
  private readonly api = inject(CitizenApi);
  private readonly notify = inject(NotifyService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly badges = inject(CitizenBadges);
  private readonly fb = inject(FormBuilder);

  readonly tags = signal<DocumentTagView[]>([]);
  readonly types = signal<DocTypeRef[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly creating = signal(false);
  readonly showForm = signal(false);
  readonly busy = signal<string | null>(null);
  /** QR affichés (uuid → image). */
  readonly qr = signal<Record<string, SafeUrl>>({});
  readonly hasQr = computed(() => Object.keys(this.qr()).length > 0);

  readonly form = this.fb.nonNullable.group({
    document_type_id: ['', Validators.required],
    label: ['', Validators.maxLength(60)],
    doc_number: ['', Validators.maxLength(50)],
  });

  readonly fieldError = fieldError;

  ngOnInit(): void {
    this.api.documentTypes().subscribe({ next: (t) => this.types.set(t), error: () => this.types.set([]) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.tags().subscribe({
      next: (list) => {
        this.tags.set(list);
        this.loading.set(false);
        this.showForm.set(list.length === 0);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Impossible de charger vos QR codes.'));
        this.loading.set(false);
      },
    });
  }

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.creating.set(true);
    this.api.createTag({ document_type_id: Number(v.document_type_id), label: v.label || null, doc_number: v.doc_number || null }).subscribe({
      next: (tag) => {
        this.creating.set(false);
        this.form.reset();
        this.showForm.set(false);
        this.remember(tag);
        this.notify.success('QR code créé : imprimez-le et collez-le au dos de la pochette.');
        this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.creating.set(false);
        if (e.status === 402) {
          this.paymentNeeded();
        } else {
          void this.notify.error(e, 'Création impossible');
        }
      },
    });
  }

  show(tag: DocumentTagView): void {
    if (this.qr()[tag.uuid]) {
      const copy = { ...this.qr() };
      delete copy[tag.uuid];
      this.qr.set(copy);
      return;
    }
    this.busy.set(tag.uuid);
    this.api.tag(tag.uuid).subscribe({
      next: (full) => {
        this.busy.set(null);
        this.remember(full);
      },
      error: (e) => {
        this.busy.set(null);
        void this.notify.error(e);
      },
    });
  }

  print(): void {
    window.print();
  }

  async renew(tag: DocumentTagView): Promise<void> {
    const ok = await this.notify.confirm({
      title: 'Renouveler ce QR code ?',
      text: 'À faire si l’étiquette est abîmée ou perdue. L’ancien QR sera désactivé.',
      confirmText: 'Renouveler',
    });
    if (!ok) {
      return;
    }
    this.busy.set(tag.uuid);
    this.api.renewTag(tag.uuid).subscribe({
      next: (res) => {
        this.busy.set(null);
        this.remember(res.tag);
        this.notify.success('Nouveau QR code prêt à imprimer.');
        this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        if (e.status === 402) {
          this.paymentNeeded();
        } else {
          void this.notify.error(e);
        }
      },
    });
  }

  async revoke(tag: DocumentTagView): Promise<void> {
    const ok = await this.notify.confirm({
      title: 'Désactiver ce QR code ?',
      text: 'Un scan de ce QR n’enverra plus d’alerte. Cette action est définitive.',
      confirmText: 'Désactiver',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.busy.set(tag.uuid);
    this.api.revokeTag(tag.uuid).subscribe({
      next: () => {
        this.busy.set(null);
        this.notify.success('QR code désactivé.');
        this.load();
      },
      error: (e) => {
        this.busy.set(null);
        void this.notify.error(e);
      },
    });
  }

  private remember(tag: DocumentTagView): void {
    if (tag.qr_svg) {
      this.qr.set({ ...this.qr(), [tag.uuid]: this.sanitizer.bypassSecurityTrustUrl(tag.qr_svg) });
    }
  }

  /** Renouvellement payant (après la phase pilote) : le frais est dans « Paiements ». */
  private paymentNeeded(): void {
    this.badges.refresh();
    void this.notify
      .confirm({
        title: 'Paiement requis',
        text: 'Le renouvellement du QR code est payant. Réglez-le avec Wave ; le nouveau QR sera actif dès le paiement confirmé.',
        confirmText: 'Aller aux paiements',
      })
      .then((go) => go && this.router.navigate(['/mon-espace/paiements']));
  }
}
