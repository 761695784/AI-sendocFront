import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { CitizenApi, PublishResponse } from '../../../core/api/citizen.api';
import { DocTypeRef, Territory } from '../../../core/api/citizen.types';
import { OcrScan } from '../../../core/api/api.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { checkImage, shrinkImage } from '../../../shared/media/image-tools';
import { currentPosition, GpsPoint, isInSenegal } from '../../../shared/media/geolocation';
import { fieldError, personNameValidator, senegalPhoneValidator } from '../../../shared/forms/validators';

type ScanState = 'idle' | 'reading' | 'read' | 'manual' | 'failed';

/**
 * Publier un document trouvé, en trois étapes :
 *  1. photo de la pièce → lecture automatique (OCR) : le formulaire se remplit, les numéros sont masqués sur la photo publique ;
 *  2. vérification des informations et du lieu (GPS ou département) ;
 *  3. accord pour être contacté par la structure la plus proche, qui viendra récupérer le document.
 */
@Component({
  selector: 'app-publish-found',
  imports: [ReactiveFormsModule, RouterLink, NavbarComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publish-found.component.html',
  styleUrl: '../citizen-form.css',
})
export class PublishFoundComponent implements OnInit, OnDestroy {
  private readonly api = inject(CitizenApi);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly types = signal<DocTypeRef[]>([]);
  readonly departments = signal<Territory[]>([]);

  readonly photo = signal<Blob | null>(null);
  readonly photoUrl = signal<string | null>(null);
  readonly photoError = signal<string | null>(null);
  readonly scanState = signal<ScanState>('idle');
  readonly scan = signal<OcrScan | null>(null);
  readonly scanMessage = signal<string | null>(null);
  /** Champs remplis par la lecture automatique (surlignés pour vérification). */
  readonly prefilled = signal<Set<string>>(new Set());

  readonly gps = signal<GpsPoint | null>(null);
  readonly gpsBusy = signal(false);
  readonly gpsError = signal<string | null>(null);

  readonly sending = signal(false);
  readonly result = signal<PublishResponse | null>(null);

  readonly form = this.fb.nonNullable.group({
    document_type_id: ['', Validators.required],
    OwnerLastName: ['', [Validators.required, Validators.maxLength(100), personNameValidator]],
    OwnerFirstName: ['', [Validators.required, Validators.maxLength(150), personNameValidator]],
    DocIdentification: ['', Validators.maxLength(50)],
    Location: ['', [Validators.required, Validators.maxLength(255)]],
    territory_code: [''],
    contact_consent: [true],
    contact_phone: ['', senegalPhoneValidator],
  });

  readonly fieldError = fieldError;

  /** Le scan peut remplacer l'envoi de la photo (déjà sur le serveur, version masquée prête). */
  readonly usableScan = computed(() => {
    const s = this.scan();
    return s && s.usable !== false && s.scan_id ? s : null;
  });

  readonly checks = computed(() => (this.scan()?.checks ?? []).filter((c) => c.message));

  ngOnInit(): void {
    this.api.documentTypes().subscribe({ next: (t) => this.types.set(t), error: () => this.types.set([]) });
    this.api.departments().subscribe({ next: (d) => this.departments.set(d), error: () => this.departments.set([]) });
    const phone = (this.session.user()?.Phone as string | undefined) ?? '';
    this.form.controls.contact_phone.setValue(phone);
  }

  ngOnDestroy(): void {
    this.revokePhotoUrl();
  }

  // ── Étape 1 : photo et lecture ───────────────────────────────────

  async onPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    const problem = checkImage(file, 5);
    if (problem) {
      this.photoError.set(problem);
      return;
    }
    this.photoError.set(null);
    const blob = await shrinkImage(file);
    this.revokePhotoUrl();
    this.photo.set(blob);
    this.photoUrl.set(URL.createObjectURL(blob));
    this.read(blob);
  }

  private read(blob: Blob): void {
    this.scan.set(null);
    this.scanMessage.set(null);
    this.scanState.set('reading');
    this.api.scan(blob).subscribe({
      next: (scan) => {
        this.scan.set(scan);
        this.scanState.set('read');
        this.applyPrefill(scan);
      },
      error: (e: HttpErrorResponse) => {
        // 503 : lecture indisponible → saisie à la main avec la photo ; 422 : photo illisible.
        this.scanState.set(e.status === 422 ? 'failed' : 'manual');
        this.scanMessage.set(apiErrorMessage(e, 'Lecture automatique indisponible : remplissez le formulaire à la main.'));
      },
    });
  }

  private applyPrefill(scan: OcrScan): void {
    const p = scan.prefill ?? {};
    const filled = new Set<string>();
    const set = (name: 'document_type_id' | 'OwnerLastName' | 'OwnerFirstName' | 'DocIdentification', value: unknown) => {
      if (value !== null && value !== undefined && value !== '') {
        this.form.controls[name].setValue(String(value));
        filled.add(name);
      }
    };
    set('document_type_id', p.document_type_id);
    set('OwnerLastName', p.OwnerLastName);
    set('OwnerFirstName', p.OwnerFirstName);
    set('DocIdentification', p.DocIdentification);
    this.prefilled.set(filled);
  }

  retake(): void {
    this.revokePhotoUrl();
    this.photo.set(null);
    this.scan.set(null);
    this.scanState.set('idle');
    this.prefilled.set(new Set());
  }

  isPrefilled(name: string): boolean {
    return this.prefilled().has(name);
  }

  // ── Étape 2 : lieu ───────────────────────────────────────────────

  async locate(): Promise<void> {
    this.gpsBusy.set(true);
    this.gpsError.set(null);
    try {
      const point = await currentPosition();
      if (!isInSenegal(point)) {
        this.gpsError.set('Votre position semble hors du Sénégal : choisissez le département à la place.');
      } else {
        this.gps.set(point);
      }
    } catch (e) {
      this.gpsError.set((e as Error).message);
    } finally {
      this.gpsBusy.set(false);
    }
  }

  // ── Étape 3 : publication ────────────────────────────────────────

  submit(): void {
    const consent = this.form.controls.contact_consent.value;
    this.form.controls.contact_phone.setValidators(consent ? [Validators.required, senegalPhoneValidator] : senegalPhoneValidator);
    this.form.controls.contact_phone.updateValueAndValidity();

    if (!this.photo() && !this.usableScan()) {
      this.photoError.set('Ajoutez une photo du document.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const data = new FormData();
    const scan = this.usableScan();
    if (scan?.scan_id) {
      data.append('ocr_scan_id', scan.scan_id);
    } else {
      data.append('image', this.photo()!, 'document.jpg');
    }
    data.append('document_type_id', v.document_type_id);
    data.append('OwnerLastName', v.OwnerLastName.trim());
    data.append('OwnerFirstName', v.OwnerFirstName.trim());
    if (v.DocIdentification.trim()) data.append('DocIdentification', v.DocIdentification.trim());
    data.append('Location', v.Location.trim());
    if (v.territory_code) data.append('territory_code', v.territory_code);
    const gps = this.gps();
    if (gps) {
      data.append('latitude', String(gps.latitude));
      data.append('longitude', String(gps.longitude));
    }
    data.append('contact_consent', consent ? '1' : '0');
    if (consent && v.contact_phone.trim()) data.append('contact_phone', v.contact_phone.trim());

    this.sending.set(true);
    this.api.publish(data).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.result.set(res);
        this.notify.success('Document publié : merci pour votre geste !');
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
      },
      error: (e: HttpErrorResponse) => {
        this.sending.set(false);
        // Scan expiré entre-temps : on renvoie la photo à la place.
        if (e.status === 422 && e.error?.errors?.ocr_scan_id && this.photo()) {
          this.scan.set(null);
          void this.notify.info('La lecture a expiré : la photo sera envoyée directement. Appuyez à nouveau sur « Publier ».');
          return;
        }
        void this.notify.error(e, 'Publication impossible');
      },
    });
  }

  another(): void {
    this.result.set(null);
    this.retake();
    this.gps.set(null);
    const phone = this.form.controls.contact_phone.value;
    this.form.reset({ contact_consent: true, contact_phone: phone });
  }

  private revokePhotoUrl(): void {
    const url = this.photoUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.photoUrl.set(null);
  }
}
