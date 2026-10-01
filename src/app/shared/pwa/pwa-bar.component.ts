import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PwaService } from './pwa.service';

/**
 * Bandeaux de l'application installable, affichés au-dessus de toutes les pages :
 * hors connexion, nouvelle version, proposition d'installation.
 */
@Component({
  selector: 'app-pwa-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div aria-live="polite" class="pwa">
      @if (!pwa.online()) {
        <div class="pwa__bar pwa__bar--offline" role="status">
          <i class="fas fa-wifi" aria-hidden="true"></i>
          <span>Pas de connexion internet. Les pages déjà ouvertes restent consultables ; les enregistrements reprendront au retour du réseau.</span>
        </div>
      }
      @if (pwa.updateReady()) {
        <div class="pwa__bar pwa__bar--update" role="status">
          <i class="fas fa-sync-alt" aria-hidden="true"></i>
          <span>Une nouvelle version de DocTrack est prête.</span>
          <button type="button" class="btn btn-sm btn-light" (click)="pwa.applyUpdate()">Mettre à jour</button>
        </div>
      }
      @if (pwa.canInstall()) {
        <div class="pwa__bar pwa__bar--install">
          <i class="fas fa-mobile-alt" aria-hidden="true"></i>
          <span>Installer DocTrack sur cet appareil : accès direct depuis l'écran d'accueil, même avec une connexion faible.</span>
          <button type="button" class="btn btn-sm btn-light" (click)="pwa.install()">Installer</button>
          <button type="button" class="btn btn-sm btn-link text-white" (click)="pwa.dismissInstall()" aria-label="Plus tard">Plus tard</button>
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
