import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Informations de référencement d'une page, déclarées dans `data.seo` de la route.
 * Une page SANS `data.seo` n'est pas indexée (espaces connectés, pages techniques).
 */
export interface SeoData {
  /** Description affichée sous le titre dans Google (≈ 150 caractères). */
  description: string;
  /** Adresse canonique si elle diffère de l'adresse visitée (ex. « / » pour « /accueil »). */
  canonical?: string;
  /** Image de partage (réseaux sociaux, WhatsApp) ; par défaut l'image DocTrack. */
  image?: string;
  /** false : page accessible mais non indexée (connexion, mot de passe…). */
  index?: boolean;
  /** false : demander aux robots de ne pas suivre les liens. */
  follow?: boolean;
  /** Valeur personnalisée pour la balise <meta name="robots"> (ex. « noindex, nofollow »). */
  robots?: string;
}

export const SITE_NAME = 'DocTrack';
const DEFAULT_IMAGE = '/assets/brand/og-doctrack.jpg';

/**
 * Met à jour à chaque navigation (et pendant le rendu serveur) les balises lues par
 * Google et par les réseaux sociaux : description, robots, adresse canonique, Open Graph, Twitter.
 * Le titre lui-même est déjà posé par le routeur (propriété `title` des routes).
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private started = false;

  init(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.apply());
  }

  private apply(): void {
    let snap: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let seo: SeoData | undefined;
    let title: string | undefined;
    while (snap) {
      if (snap.data?.['seo']) {
        seo = snap.data['seo'] as SeoData;
      }
      if (snap.title) {
        title = snap.title;
      }
      snap = snap.firstChild;
    }

    const base = environment.siteUrl.replace(/\/$/, '');
    const path = this.router.url.split(/[?#]/)[0] || '/';
    const url = base + (seo?.canonical ?? path);
    const image = base + (seo?.image ?? DEFAULT_IMAGE);
    const indexable = !!seo && seo.index !== false;

    const robotsContent = seo?.robots ?? (
      indexable
        ? 'index, follow, max-image-preview:large'
        : (seo?.follow === false ? 'noindex, nofollow' : 'noindex, follow')
    );
    this.meta.updateTag({ name: 'robots', content: robotsContent });
    this.setCanonical(indexable ? url : null);

    if (!seo) {
      return;
    }
    const pageTitle = title ?? SITE_NAME;
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  /** Une seule balise <link rel="canonical"> ; retirée sur les pages non indexées. */
  private setCanonical(url: string | null): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!url) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
