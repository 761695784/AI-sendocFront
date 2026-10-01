import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Évènement « beforeinstallprompt » (Chrome, Edge, Android) : proposer l'installation au bon moment. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Application installable (PWA) : connexion perdue, nouvelle version disponible, installation sur le téléphone.
 * Tout est inactif côté serveur (rendu SSR) et en développement (pas de service worker).
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly updates = inject(SwUpdate);
  private installEvent: InstallPromptEvent | null = null;

  /** Faux quand l'appareil n'a plus de connexion. */
  readonly online = signal(true);
  /** Une nouvelle version a été téléchargée : il suffit de recharger. */
  readonly updateReady = signal(false);
  /** Le navigateur propose d'installer l'application. */
  readonly canInstall = signal(false);

  constructor() {
    if (!this.browser) {
      return;
    }
    this.online.set(navigator.onLine);
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installEvent = event as InstallPromptEvent;
      this.canInstall.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.installEvent = null;
      this.canInstall.set(false);
    });

    if (this.updates.isEnabled) {
      this.updates.versionUpdates.pipe(filter((e) => e.type === 'VERSION_READY')).subscribe(() => this.updateReady.set(true));
      // Version en cache devenue inutilisable (fichiers supprimés du serveur) : rechargement complet.
      this.updates.unrecoverable.subscribe(() => document.location.reload());
      // Vérification toutes les 6 heures pour ceux qui laissent l'onglet ouvert (guichets).
      setInterval(() => this.updates.checkForUpdate().catch(() => undefined), 6 * 60 * 60 * 1000);
    }
  }

  async install(): Promise<void> {
    if (!this.installEvent) {
      return;
    }
    await this.installEvent.prompt();
    await this.installEvent.userChoice.catch(() => undefined);
    this.installEvent = null;
    this.canInstall.set(false);
  }

  dismissInstall(): void {
    this.canInstall.set(false);
  }

  async applyUpdate(): Promise<void> {
    await this.updates.activateUpdate().catch(() => undefined);
    document.location.reload();
  }
}
