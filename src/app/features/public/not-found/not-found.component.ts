import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { SessionStore } from '../../../core/session/session.store';

/** Adresse inconnue : message clair et liens utiles, au lieu d'une page blanche. */
@Component({
  selector: 'app-not-found',
  imports: [TranslatePipe, RouterLink, NavbarComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <div class="dt-page">
      <div class="dt-container text-center" style="max-width: 560px; padding-top: 4rem; padding-bottom: 4rem">
        <p class="display-4 fw-bold mb-1" style="color: #31287c" aria-hidden="true">404</p>
        <h1 class="h3">{{ 'notfound.cette_page_n_existe_pas' | t }}</h1>
        <p class="dt-muted">{{ 'notfound.le_lien_est_peut_etre_incomplet' | t }}</p>
        <div class="d-flex flex-wrap justify-content-center gap-2 mt-3">
          <a [routerLink]="home()" class="btn btn-dt">{{ homeLabel() }}</a>
          <a routerLink="/liste" class="btn btn-outline-secondary">{{ 'notfound.documents_retrouves' | t }}</a>
          <a routerLink="/verifier" class="btn btn-outline-secondary">{{ 'verify.verifier_un_certificat' | t }}</a>
        </div>
      </div>
    </div>
    <app-footer />
  `,
})
export class NotFoundComponent {
  private readonly i18n = inject(I18nService);
  private readonly session = inject(SessionStore);
  readonly home = computed(() => (this.session.isAuthenticated() ? this.session.homeUrl() : '/accueil'));
  readonly homeLabel = computed(() => (this.session.isAuthenticated() ? this.i18n.t('notfound.retour_a_mon_espace') : this.i18n.t('notfound.retour_a_l_accueil')));
}
