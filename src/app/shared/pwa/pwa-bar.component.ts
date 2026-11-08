import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PwaService } from './pwa.service';

/**
 * Bandeaux de l'application installable, affichés au-dessus de toutes les pages :
 * hors connexion, nouvelle version, proposition d'installation.
 */
@Component({
  selector: 'app-pwa-bar',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div aria-live="polite" class="pwa">
      @if (!pwa.online()) {
        <div class="pwa__bar pwa__bar--offline" role="status">
          <i class="fas fa-wifi" aria-hidden="true"></i>
          <span>{{ 'pwa.pas_de_connexion_internet_les_pages' | t }}</span>
        </div>
      }
      @if (pwa.updateReady()) {
        <div class="pwa__bar pwa__bar--update" role="status">
          <i class="fas fa-sync-alt" aria-hidden="true"></i>
          <span>{{ 'pwa.une_nouvelle_version_de_doctrack_est' | t }}</span>
          <button type="button" class="btn btn-sm btn-light" (click)="pwa.applyUpdate()">{{ 'pwa.mettre_a_jour' | t }}</button>
        </div>
      }
      @if (pwa.canInstall()) {
        <div class="pwa__bar pwa__bar--install">
          <i class="fas fa-mobile-alt" aria-hidden="true"></i>
          <span>{{ 'pwa.installer_doctrack_sur_cet_appareil_acce' | t }}</span>
          <button type="button" class="btn btn-sm btn-light" (click)="pwa.install()">{{ 'pwa.installer' | t }}</button>
          <button type="button" class="btn btn-sm btn-link text-white" (click)="pwa.dismissInstall()" [aria-label]="'pwa.plus_tard' | t">{{ 'pwa.plus_tard' | t }}</button>
        </div>
      }
    </div>
  `,
  styles: `
    .pwa { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2000; display: flex; flex-direction: column; }
    .pwa__bar { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; padding: .6rem 1rem; color: #fff; font-size: .9rem; }
    .pwa__bar span { flex: 1; min-width: 200px; }
    .pwa__bar--offline { background: #5f6b7a; }
    .pwa__bar--update { background: #1d5b99; }
    .pwa__bar--install { background: #31287c; }
  `,
})
export class PwaBarComponent {
  readonly pwa = inject(PwaService);
}
