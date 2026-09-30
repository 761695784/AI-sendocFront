import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CounterApi } from '../../../core/api/counter.api';
import { ID_TYPE_LABELS, IdType, RestitutionPayload, RestitutionPreparation, RestitutionView } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { OcrScan } from '../../../core/api/api.types';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { openBlob } from '../../../shared/media/open-blob';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PhotoScanComponent, PhotoScanResult } from '../../../shared/photo-scan/photo-scan.component';
import { fieldError, personNameValidator, senegalPhoneValidator } from '../../../shared/forms/validators';
import { toIsoDate } from './document-deposit.component';

/**
 * Restitution officielle au guichet : contrôle de la pièce d'identité (lecture OCR possible),
 * retrait par le titulaire ou par procuration, dérogations motivées (responsable), puis décharge à faire signer.
 */
@Component({
  selector: 'app-staff-document-restitution',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, PageHeaderComponent, LoadingComponent, ErrorStateComponent, PhotoScanComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './document-restitution.component.html',
})
export class StaffDocumentRestitutionComponent implements OnInit {
  private readonly api = inject(CounterApi);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly uuid = input.required<string>();

  readonly prep = signal<RestitutionPreparation | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly done = signal<RestitutionView | null>(null);
  /** Dérogations demandées par l'API (nom différent, alerte de vigilance ouverte). */
  readonly needNameOverride = signal<string | null>(null);
  readonly needVigilanceOverride = signal<string | null>(null);
  readonly uploading = signal(false);

  readonly idTypes = Object.entries(ID_TYPE_LABELS) as [IdType, string][];
  readonly fieldError = fieldError;
  readonly ownerScanner = (photo: Blob) => this.api.scan(photo, 'identity_check');
  readonly proxyScanner = (photo: Blob) => this.api.scan(photo, 'identity_check');

  private ownerScan: OcrScan | null = null;
  private proxyScan: OcrScan | null = null;

  readonly form = this.fb.nonNullable.group({
    recipient_type: ['owner' as 'owner' | 'proxy'],
    owner: this.fb.nonNullable.group({
      last_name: ['', [Validators.required, personNameValidator]],
      first_name: ['', [Validators.required, personNameValidator]],
      birth_date: [''],
      id_type: ['cni' as IdType | ''],
      id_number: ['', [Validators.minLength(4), Validators.maxLength(50)]],
      phone: ['', senegalPhoneValidator],
    }),
    proxy: this.fb.nonNullable.group({
      last_name: [''],
      first_name: [''],
      id_type: ['cni' as IdType | ''],
      id_number: [''],
      phone: ['', senegalPhoneValidator],
      relationship: [''],
      power_of_attorney_ref: [''],
    }),
    identity_photo_matches: [false, Validators.requiredTrue],
    power_of_attorney_verified: [false],
    name_override_reason: [''],
    vigilance_override_reason: [''],
  });

  ngOnInit(): void {
    this.api.prepareRestitution(this.uuid()).subscribe({
      next: (p) => {
        this.prep.set(p);
        this.loading.set(false);
        this.form.controls.owner.patchValue({
          last_name: p.document.owner_last_name ?? '',
          first_name: p.document.owner_first_name ?? '',
          birth_date: p.document.birth_date ?? '',
        });
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Restitution impossible pour ce document.'));
        this.loading.set(false);
      },
    });
  }

  get isProxy(): boolean {
    return this.form.controls.recipient_type.value === 'proxy';
  }

  onOwnerScan(r: PhotoScanResult): void {
    this.ownerScan = r.scan;
    const p = r.scan?.prefill;
    if (p) {
      this.form.controls.owner.patchValue({
        last_name: p.OwnerLastName ?? this.form.controls.owner.controls.last_name.value,
        first_name: p.OwnerFirstName ?? this.form.controls.owner.controls.first_name.value,
        id_number: p.DocIdentification ?? this.form.controls.owner.controls.id_number.value,
        birth_date: toIsoDate(r.scan?.fields?.birth_date?.value) ?? this.form.controls.owner.controls.birth_date.value,
      });
    }
  }

  onProxyScan(r: PhotoScanResult): void {
    this.proxyScan = r.scan;
    const p = r.scan?.prefill;
    if (p) {
      this.form.controls.proxy.patchValue({
        last_name: p.OwnerLastName ?? '',
        first_name: p.OwnerFirstName ?? '',
        id_number: p.DocIdentification ?? '',
      });
    }
  }

  submit(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (!v.identity_photo_matches) {
        void this.notify.error('Confirmez que la photo de la pièce d’identité correspond à la personne présente.');
      }
      return;
    }
    const ownerId = !this.ownerScan && !this.isProxy;
    if (ownerId && !(v.owner.id_type && v.owner.id_number.trim())) {
      void this.notify.error('Indiquez le type et le numéro de la pièce d’identité présentée (ou photographiez-la).');
      return;
    }
    if (this.isProxy) {
      if (!v.proxy.last_name.trim() || !v.proxy.first_name.trim()) {
        void this.notify.error('Indiquez le nom et le prénom du mandataire.');
        return;
      }
      if (!this.proxyScan && !(v.proxy.id_type && v.proxy.id_number.trim())) {
        void this.notify.error('Indiquez la pièce d’identité du mandataire (ou photographiez-la).');
        return;
      }
    }

    const payload: RestitutionPayload = {
      recipient_type: v.recipient_type,
      owner: {
        first_name: v.owner.first_name.trim(),
        last_name: v.owner.last_name.trim(),
        birth_date: v.owner.birth_date || null,
        id_type: (v.owner.id_type || null) as IdType | null,
        id_number: v.owner.id_number.trim() || null,
        phone: v.owner.phone.trim() || null,
        ocr_scan_id: this.ownerScan?.scan_id ?? null,
      },
      checks: { identity_photo_matches: v.identity_photo_matches },
      name_override_reason: v.name_override_reason.trim() || null,
      vigilance_override_reason: v.vigilance_override_reason.trim() || null,
    };
    if (this.isProxy) {
      payload.proxy = {
        first_name: v.proxy.first_name.trim(),
        last_name: v.proxy.last_name.trim(),
        id_type: (v.proxy.id_type || null) as IdType | null,
        id_number: v.proxy.id_number.trim() || null,
        phone: v.proxy.phone.trim() || null,
        relationship: v.proxy.relationship.trim() || null,
        power_of_attorney_ref: v.proxy.power_of_attorney_ref.trim() || null,
        ocr_scan_id: this.proxyScan?.scan_id ?? null,
      };
      payload.checks.power_of_attorney_verified = v.power_of_attorney_verified;
    }

    this.saving.set(true);
    this.api.restitute(this.uuid(), payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.done.set(res);
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
      },
      error: (e: HttpErrorResponse) => {
        this.saving.set(false);
        const errors = e.error?.errors ?? {};
        if (e.status === 422 && (errors.name_override_reason || errors.vigilance_override_reason)) {
          this.needNameOverride.set(errors.name_override_reason?.[0] ?? this.needNameOverride());
          this.needVigilanceOverride.set(errors.vigilance_override_reason?.[0] ?? this.needVigilanceOverride());
          void this.notify.info('Une autorisation motivée est nécessaire : voir en bas du formulaire.', 'Dérogation requise');
          return;
        }
        void this.notify.error(e, 'Restitution refusée');
      },
    });
  }

  printDischarge(r: RestitutionView): void {
    this.api.dischargePdf(r.uuid).subscribe({
      next: (blob) => openBlob(blob, `${r.reference}.pdf`),
      error: (e) => void this.notify.error(e, 'Décharge indisponible'),
    });
  }

  onSignedScan(event: Event, r: RestitutionView): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.api.attachSignedScan(r.uuid, file, file.name).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.done.set(res);
        this.notify.success('Décharge signée enregistrée.');
      },
      error: (e) => {
        this.uploading.set(false);
        void this.notify.error(e);
      },
    });
  }

  finish(r: RestitutionView): void {
    this.router.navigate(['/espace/restitutions', r.uuid]);
  }
}
