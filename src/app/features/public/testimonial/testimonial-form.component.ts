import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { RedirectService } from '../../../components/services/redirection.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SessionStore } from '../../../core/session/session.store';
import { TestimonialRole, TestimonialsApi } from '../../../core/api/testimonials.api';
import { apiErrorMessage } from '../../../core/api/api-v2.client';

export const BODY_MIN = 20;
export const BODY_MAX = 500;

/**
 * Partager son témoignage. Envoyé à l'équipe DocTrack (e-mail + boîte de réception du super admin),
 * publié seulement après relecture, avec le prénom et la ville. Le contact n'est jamais publié.
 * Compte facultatif ; connecté, le témoignage peut recevoir le badge « Restitution vérifiée ».
 */
@Component({
  selector: 'app-testimonial-form',
  imports: [ReactiveFormsModule, RouterLink, NavbarComponent, FooterComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../citizen/citizen-form.css',
  template: `
    <app-navbar />
    <div class="cf-page">
      <section class="cf-hero">
        <div class="cf-hero__inner">
          <span class="cf-badge"><i class="fas fa-comment-dots" aria-hidden="true"></i> {{ 'testi.badge' | t }}</span>
          <h1>{{ 'testi.form_title' | t }}</h1>
          <p>{{ 'testi.form_intro' | t }}</p>
        </div>
      </section>

      <div class="cf-container">
        @if (sent()) {
          <div class="cf-card" style="max-width: 760px; margin: 0 auto">
            <div class="cf-success">
              <span class="cf-success__icon"><i class="fas fa-heart" aria-hidden="true"></i></span>
              <h2>{{ 'testi.thanks_title' | t }}</h2>
              <p>{{ 'testi.thanks_text' | t }}</p>
              <div class="cf-actions">
                <a routerLink="/accueil" class="cf-btn cf-btn--primary"><i class="fas fa-home" aria-hidden="true"></i> {{ 'testi.back_home' | t }}</a>
              </div>
            </div>
          </div>
        } @else {
          <div class="cf-layout">
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <section class="cf-card">
                <header class="cf-card__head">
                  <span class="cf-num">1</span>
                  <div><h2>{{ 'testi.step_story' | t }}</h2><p>{{ 'testi.step_story_help' | t }}</p></div>
                </header>
                <div class="cf-card__body">
                  <fieldset class="tf-roles">
                    <legend class="dt-required">{{ 'testi.role_question' | t }}</legend>
                    @for (r of roles; track r.value) {
                      <label class="tf-role" [class.active]="form.controls.role.value === r.value">
                        <input type="radio" formControlName="role" [value]="r.value" />
                        <i class="fas" [class]="r.icon" aria-hidden="true"></i> {{ r.label | t }}
                      </label>
                    }
                  </fieldset>

                  <div class="tf-rating">
                    <span id="rating-label">{{ 'testi.rating_label' | t }} <span class="cf-opt">{{ 'declare.facultatif' | t }}</span></span>
                    <div role="radiogroup" aria-labelledby="rating-label">
                      @for (s of stars; track s) {
                        <button type="button" role="radio" class="tf-star" [class.on]="s <= (form.controls.rating.value ?? 0)"
                          [attr.aria-checked]="form.controls.rating.value === s" [attr.aria-label]="'testi.rating_aria' | t: { n: s }"
                          (click)="setRating(s)"><i class="fas fa-star" aria-hidden="true"></i></button>
                      }
                    </div>
                  </div>

                  <label for="tf-body" class="dt-required">{{ 'testi.body_label' | t }}</label>
                  <textarea id="tf-body" class="form-control" rows="5" formControlName="body" [attr.maxlength]="bodyMax"
                    [placeholder]="'testi.body_placeholder' | t"></textarea>
                  <div class="tf-count" [class.bad]="bodyLength() > 0 && bodyLength() < bodyMin">{{ bodyLength() }} / {{ bodyMax }}</div>
                  @if (showError('body')) { <small class="dt-error">{{ 'testi.body_error' | t: { n: bodyMin } }}</small> }
                  <small class="form-text">{{ 'testi.body_hint' | t }}</small>
                </div>
              </section>

              <section class="cf-card">
                <header class="cf-card__head">
                  <span class="cf-num">2</span>
                  <div><h2>{{ 'testi.step_who' | t }}</h2><p>{{ 'testi.step_who_help' | t }}</p></div>
                </header>
                <div class="cf-card__body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label for="tf-first" class="dt-required">{{ 'testi.first_name' | t }}</label>
                      <input id="tf-first" class="form-control" formControlName="first_name" autocomplete="given-name" />
                      @if (showError('first_name')) { <small class="dt-error">{{ 'testi.required' | t }}</small> }
                    </div>
                    <div class="col-md-6">
                      <label for="tf-city" class="dt-required">{{ 'testi.city' | t }}</label>
                      <input id="tf-city" class="form-control" formControlName="city" autocomplete="address-level2" [placeholder]="'testi.city_placeholder' | t" />
                      @if (showError('city')) { <small class="dt-error">{{ 'testi.required' | t }}</small> }
                    </div>
                    <div class="col-12">
                      <label for="tf-contact">{{ 'testi.contact' | t }} <span class="cf-opt">{{ 'declare.facultatif' | t }}</span></label>
                      <input id="tf-contact" class="form-control" formControlName="contact" autocomplete="tel" />
                      <small class="form-text">{{ 'testi.contact_hint' | t }}</small>
                    </div>
                  </div>
                  <!-- Champ piège : invisible pour les personnes, rempli par les robots -->
                  <div class="tf-hp" aria-hidden="true">
                    <label for="tf-website">Site web</label>
                    <input id="tf-website" type="text" formControlName="website" tabindex="-1" autocomplete="off" />
                  </div>
                </div>
              </section>

              <label class="tf-consent">
                <input type="checkbox" formControlName="consent" />
                <span>{{ 'testi.consent' | t }}</span>
              </label>
              @if (showError('consent')) { <small class="dt-error d-block mb-2">{{ 'testi.consent_error' | t }}</small> }

              @if (error()) { <div class="dt-callout dt-callout--danger"><i class="fas fa-exclamation-circle" aria-hidden="true"></i><div>{{ error() }}</div></div> }

              <button type="submit" class="cf-submit" [disabled]="sending()">
                <i class="fas fa-paper-plane" aria-hidden="true"></i> {{ (sending() ? 'testi.sending' : 'testi.send') | t }}
              </button>
            </form>

            <aside class="cf-aside" [attr.aria-label]="'declare.aide' | t">
              <div class="cf-box">
                <h3><i class="fas fa-shield-alt" aria-hidden="true"></i> {{ 'testi.privacy_title' | t }}</h3>
                <ul class="cf-tips">
                  <li><i class="fas fa-check-circle" aria-hidden="true"></i> {{ 'testi.privacy_1' | t }}</li>
                  <li><i class="fas fa-check-circle" aria-hidden="true"></i> {{ 'testi.privacy_2' | t }}</li>
                  <li><i class="fas fa-check-circle" aria-hidden="true"></i> {{ 'testi.privacy_3' | t }}</li>
                </ul>
              </div>
              <div class="cf-box">
                <h3><i class="fas fa-check-circle" aria-hidden="true"></i> {{ 'testi.verified' | t }}</h3>
                @if (session.isAuthenticated()) {
                  <p class="mb-0">{{ 'testi.verified_connected' | t }}</p>
                } @else {
                  <p>{{ 'testi.verified_login' | t }}</p>
                  <a routerLink="/connexion" class="cf-btn cf-btn--ghost" (click)="rememberReturn()"><i class="fas fa-sign-in-alt" aria-hidden="true"></i> {{ 'nav.login' | t }}</a>
                }
              </div>
            </aside>
          </div>
        }
      </div>
    </div>
    <app-footer />
  `,
  styles: `
    .tf-roles { border: 0; padding: 0; margin: 0 0 18px; display: flex; flex-wrap: wrap; gap: 10px; }
    .tf-roles legend { font-size: .95rem; font-weight: 600; margin-bottom: 8px; width: 100%; }
    .tf-role { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px; border: 1.5px solid #dcd9ee; cursor: pointer; font-weight: 600; color: #31287C; background: #fff; }
    .tf-role input { position: absolute; opacity: 0; pointer-events: none; }
    .tf-role.active { border-color: #31287C; background: #f1effb; }
    .tf-role:focus-within { outline: 3px solid rgba(246,165,0,.5); outline-offset: 2px; }
    .tf-rating { margin-bottom: 16px; }
    .tf-rating > span { display: block; font-size: .95rem; font-weight: 600; margin-bottom: 6px; }
    .tf-star { border: 0; background: none; padding: 2px 4px; font-size: 1.6rem; color: #e3e0f0; cursor: pointer; }
    .tf-star.on { color: #F6A500; }
    .tf-star:focus-visible { outline: 3px solid rgba(49,40,124,.4); border-radius: 6px; }
    .tf-count { text-align: right; font-size: .8rem; color: #6b7280; margin-top: 4px; }
    .tf-count.bad { color: #b42318; }
    .tf-hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
    .tf-consent { display: flex; gap: 10px; align-items: flex-start; background: #fff; border-radius: 14px; padding: 14px 16px; margin: 4px 0 12px; border: 1px solid #ebe8f6; cursor: pointer; }
    .tf-consent input { margin-top: 4px; width: 18px; height: 18px; flex: none; }
  `,
})
export class TestimonialFormComponent {
  private readonly api = inject(TestimonialsApi);
  private readonly i18n = inject(I18nService);
  private readonly redirect = inject(RedirectService);
  readonly session = inject(SessionStore);
  private readonly fb = inject(FormBuilder);

  readonly bodyMin = BODY_MIN;
  readonly bodyMax = BODY_MAX;
  readonly stars = [1, 2, 3, 4, 5];
  readonly roles: { value: TestimonialRole; label: 'testi.role_owner' | 'testi.role_finder' | 'testi.role_other'; icon: string }[] = [
    { value: 'owner', label: 'testi.role_owner', icon: 'fa-id-card' },
    { value: 'finder', label: 'testi.role_finder', icon: 'fa-hands-helping' },
    { value: 'other', label: 'testi.role_other', icon: 'fa-comment' },
  ];

  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    role: this.fb.nonNullable.control<TestimonialRole>('owner', Validators.required),
    rating: this.fb.control<number | null>(null),
    body: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(BODY_MIN), Validators.maxLength(BODY_MAX)]),
    first_name: this.fb.nonNullable.control((this.session.user()?.FirstName as string | undefined) ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]),
    city: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]),
    contact: this.fb.nonNullable.control('', Validators.maxLength(120)),
    consent: this.fb.nonNullable.control(false, Validators.requiredTrue),
    website: this.fb.nonNullable.control(''),
  });

  private readonly bodyValue = toSignal(this.form.controls.body.valueChanges, { initialValue: '' });
  readonly bodyLength = computed(() => (this.bodyValue() ?? '').trim().length);

  setRating(n: number): void {
    this.form.controls.rating.setValue(this.form.controls.rating.value === n ? null : n);
  }

  showError(name: 'body' | 'first_name' | 'city' | 'consent'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  rememberReturn(): void {
    this.redirect.setRedirectUrl('/temoigner');
  }

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.sending.set(true);
    this.api
      .submit({
        role: v.role,
        rating: v.rating,
        body: v.body.trim(),
        first_name: v.first_name.trim(),
        city: v.city.trim(),
        contact: v.contact.trim() || null,
        consent: v.consent,
        locale: this.i18n.lang(),
        website: v.website,
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        },
        error: (e) => {
          this.sending.set(false);
          this.error.set(apiErrorMessage(e, this.i18n.t('testi.send_error')));
        },
      });
  }
}
