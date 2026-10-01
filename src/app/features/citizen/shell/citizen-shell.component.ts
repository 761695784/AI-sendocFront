import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { SessionStore } from '../../../core/session/session.store';
import { CitizenBadges } from '../citizen-badges.service';

/** Mise en page de l'espace citoyen : barre publique, bandeau, onglets. */
@Component({
  selector: 'app-citizen-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NavbarComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <div class="dt-page">
      <section class="dt-hero">
        <div class="dt-hero__inner">
          <h1>Mon espace DocTrack</h1>
          <p>Bonjour {{ firstName() }}. Suivez vos déclarations, les documents que vous avez trouvés et vos QR codes.</p>
          <nav class="dt-tabs" aria-label="Rubriques de mon espace">
            <a class="dt-tab" routerLink="declarations" routerLinkActive="active">
              <i class="fas fa-file-alt me-1" aria-hidden="true"></i> Mes déclarations
            </a>
            <a class="dt-tab" routerLink="restitutions" routerLinkActive="active">
              <i class="fas fa-handshake me-1" aria-hidden="true"></i> Remises
              @if (badges.restitutionsToAnswer() > 0) {
                <span class="dt-count">{{ badges.restitutionsToAnswer() }}</span>
              }
            </a>
            <a class="dt-tab" routerLink="trouvailles" routerLinkActive="active">
              <i class="fas fa-search-location me-1" aria-hidden="true"></i> Documents trouvés
            </a>
            <a class="dt-tab" routerLink="qr" routerLinkActive="active">
              <i class="fas fa-qrcode me-1" aria-hidden="true"></i> Mes QR codes
            </a>
            <a class="dt-tab" routerLink="paiements" routerLinkActive="active">
              <i class="fas fa-wallet me-1" aria-hidden="true"></i> Paiements
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
