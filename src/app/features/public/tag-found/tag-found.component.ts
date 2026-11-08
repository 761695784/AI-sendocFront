import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { CitizenApi } from '../../../core/api/citizen.api';
import { PublicTagView, TagFoundAnswer } from '../../../core/api/citizen.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { LoadingComponent } from '../../../shared/ui/state.components';
import { currentPosition, GpsPoint, isInSenegal } from '../../../shared/media/geolocation';
import { fieldError, senegalPhoneValidator } from '../../../shared/forms/validators';

/**
 * Page ouverte en scannant le QR collé sur un document (/t/:token), sans compte.
 * Le trouveur indique où il a trouvé la pièce ; le propriétaire est prévenu immédiatement.
 * Aucune donnée personnelle du propriétaire n'est affichée.
 */
@Component({
  selector: 'app-tag-found',
  imports: [TranslatePipe, ReactiveFormsModule, RouterLink, NavbarComponent, FooterComponent, LoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tag-found.component.html',
})
export class TagFoundComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly api = inject(CitizenApi);
  private readonly fb = inject(FormBuilder);

  /** Jeton lu dans l'adresse /t/:token (liaison automatique du routeur). */
  readonly token = input.required<string>();

  readonly view = signal<PublicTagView | null>(null);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly answer = signal<TagFoundAnswer | null>(null);
  readonly error = signal<string | null>(null);
  readonly gps = signal<GpsPoint | null>(null);
  readonly gpsBusy = signal(false);
  readonly gpsError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    finder_phone: ['', [Validators.required, senegalPhoneValidator]],
    finder_name: ['', Validators.maxLength(100)],
    place: ['', Validators.maxLength(255)],
    allow_owner_contact: [true],
    contact_consent: [true],
  });

  readonly fieldError = fieldError;

  ngOnInit(): void {
    this.api.publicTag(this.token()).subscribe({
      next: (v) => {
        this.view.set(v);
        this.loading.set(false);
      },
      error: (e) => {
        this.view.set(e?.error?.valid === false ? e.error : { valid: false, message: apiErrorMessage(e, this.i18n.t('tagfound.qr_code_inconnu')) });
        this.loading.set(false);
      },
    });
  }

  async locate(): Promise<void> {
    this.gpsBusy.set(true);
    this.gpsError.set(null);
    try {
      const p = await currentPosition();
      if (isInSenegal(p)) {
        this.gps.set(p);
      } else {
        this.gpsError.set(this.i18n.t('tagfound.position_hors_du_senegal_decrivez_plutot'));
      }
    } catch (e) {
      this.gpsError.set((e as Error).message);
    } finally {
      this.gpsBusy.set(false);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (!v.place.trim() && !this.gps()) {
      this.error.set(this.i18n.t('tagfound.indiquez_le_lieu_ou_partagez_votre'));
      return;
    }
    this.error.set(null);
    this.sending.set(true);
    this.api
      .reportTagFound(this.token(), {
        finder_phone: v.finder_phone.trim(),
        finder_name: v.finder_name.trim() || null,
        place: v.place.trim() || null,
        latitude: this.gps()?.latitude ?? null,
        longitude: this.gps()?.longitude ?? null,
        allow_owner_contact: v.allow_owner_contact,
        contact_consent: v.contact_consent,
      })
      .subscribe({
        next: (a) => {
          this.sending.set(false);
          this.answer.set(a);
        },
        error: (e) => {
          this.sending.set(false);
          this.error.set(apiErrorMessage(e, this.i18n.t('tagfound.envoi_impossible_pour_le_moment_reessaye')));
        },
      });
  }
}
