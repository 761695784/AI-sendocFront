import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Testimonial, TestimonialsApi } from '../../core/api/testimonials.api';

/**
 * Témoignages publiés (validés par l'équipe DocTrack), en cartes.
 * Rien n'est affiché tant qu'aucun témoignage n'a été validé : jamais de faux témoignage.
 * Chargés dans le navigateur seulement (pas pendant le rendu serveur).
 */
@Component({
  selector: 'app-testimonials-wall',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length) {
      <div class="tw" role="list" [attr.aria-label]="'testi.badge' | t">
        @for (t of items(); track t.uuid) {
          <figure class="tw__card" role="listitem">
            @if (t.rating) {
              <div class="tw__stars" [attr.aria-label]="'testi.rating_aria' | t: { n: t.rating }">
                @for (s of stars; track s) { <i class="fas fa-star" [class.off]="s > t.rating!" aria-hidden="true"></i> }
              </div>
            }
            <blockquote>« {{ t.body }} »</blockquote>
            <figcaption>
              <span class="tw__avatar" aria-hidden="true">{{ t.first_name.charAt(0).toUpperCase() }}</span>
              <span class="tw__who">
                <strong>{{ t.first_name }}</strong>
                <small>{{ t.city }} · {{ (t.role === 'finder' ? 'testi.role_finder_short' : t.role === 'owner' ? 'testi.role_owner_short' : 'testi.role_other_short') | t }}</small>
              </span>
              @if (t.verified) {
                <span class="tw__verified" [title]="'testi.verified_title' | t"><i class="fas fa-check-circle" aria-hidden="true"></i> {{ 'testi.verified' | t }}</span>
              }
            </figcaption>
          </figure>
        }
      </div>
    }
  `,
  styles: `
    .tw { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; max-width: 1100px; margin: 0 auto 40px; }
    .tw__card { margin: 0; background: #fff; border-radius: 18px; padding: 22px 22px 18px; border: 1px solid rgba(49,40,124,.08);
      box-shadow: 0 4px 20px rgba(49,40,124,.07); display: flex; flex-direction: column; gap: 12px; }
    .tw__stars { color: #F6A500; font-size: 14px; display: flex; gap: 3px; }
    .tw__stars .off { color: #e3e0f0; }
    blockquote { margin: 0; color: #2f2a4f; font-size: 15px; line-height: 1.65; flex: 1; }
    figcaption { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; border-top: 1px solid #f0eef8; padding-top: 12px; }
    .tw__avatar { width: 38px; height: 38px; border-radius: 50%; background: #31287C; color: #F6A500; display: grid; place-items: center; font-weight: 800; }
    .tw__who { display: flex; flex-direction: column; line-height: 1.25; flex: 1; min-width: 120px; }
    .tw__who strong { color: #31287C; }
    .tw__who small { color: #6b7280; }
    .tw__verified { font-size: 12px; font-weight: 700; color: #1b7f3b; background: #e3f4ea; border-radius: 999px; padding: 4px 10px; }
  `,
})
export class TestimonialsWallComponent {
  private readonly api = inject(TestimonialsApi);
  readonly limit = input(6);
  readonly items = signal<Testimonial[]>([]);
  readonly stars = [1, 2, 3, 4, 5];

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      queueMicrotask(() =>
        this.api.published(this.limit()).subscribe({ next: (r) => this.items.set(r.data ?? []), error: () => this.items.set([]) }),
      );
    }
  }
}
