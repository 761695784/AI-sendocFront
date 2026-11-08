import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { SessionStore } from '../../../core/session/session.store';
import { CitizenBadges } from '../citizen-badges.service';

/** Mise en page de l'espace citoyen : barre publique, bandeau, onglets. */
@Component({
  selector: 'app-citizen-shell',
  imports: [TranslatePipe, RouterOutlet, RouterLink, RouterLinkActive, NavbarComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <div class="dt-page">
      <section class="dt-hero">
        <div class="dt-hero__inner">
          <h1>{{ 'space.mon_espace_doctrack' | t }}</h1>
          <p>{{ 'space.bonjour' | t }} {{ firstName() }}{{ 'space.suivez_vos_declarations_les_documents_qu' | t }}</p>
          <nav class="dt-tabs" [aria-label]="'space.rubriques_de_mon_espace' | t">
            <a class="dt-tab" routerLink="declarations" routerLinkActive="active">
              <i class="fas fa-file-alt me-1" aria-hidden="true"></i> {{ 'space.mes_declarations' | t }}
            </a>
            <a class="dt-tab" routerLink="restitutions" routerLinkActive="active">
              <i class="fas fa-handshake me-1" aria-hidden="true"></i> {{ 'space.remises' | t }}
              @if (badges.restitutionsToAnswer() > 0) {
                <span class="dt-count">{{ badges.restitutionsToAnswer() }}</span>
              }
            </a>
            <a class="dt-tab" routerLink="trouvailles" routerLinkActive="active">
              <i class="fas fa-search-location me-1" aria-hidden="true"></i> {{ 'space.documents_trouves' | t }}
            </a>
            <a class="dt-tab" routerLink="qr" routerLinkActive="active">
              <i class="fas fa-qrcode me-1" aria-hidden="true"></i> {{ 'space.mes_qr_codes' | t }}
            </a>
            <a class="dt-tab" routerLink="paiements" routerLinkActive="active">
              <i class="fas fa-wallet me-1" aria-hidden="true"></i> {{ 'space.paiements' | t }}
              @if (badges.chargesToPay() > 0) {
                <span class="dt-count">{{ badges.chargesToPay() }}</span>
              }
            </a>
          </nav>
        </div>
      </section>
      <main class="dt-container" id="contenu" tabindex="-1">
        <router-outlet />
      </main>
    </div>
    <app-footer />
  `,
})
export class CitizenShellComponent implements OnInit {
  private readonly session = inject(SessionStore);
  readonly badges = inject(CitizenBadges);
  readonly firstName = computed(() => (this.session.user()?.FirstName as string) || '');

  ngOnInit(): void {
    this.badges.refresh();
  }
}
