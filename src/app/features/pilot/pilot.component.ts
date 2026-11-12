import { Component, ChangeDetectionStrategy, DestroyRef, ElementRef, HostListener, afterNextRender, signal, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, Scroll } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PilotNavbarComponent } from './pilot-navbar.component';
import { PilotFooterComponent } from './pilot-footer.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-pilot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PilotNavbarComponent,
    PilotFooterComponent,
    TranslatePipe
  ],
  host: { id: 'pilot-top', tabindex: '-1' },
  templateUrl: './pilot.component.html',
  styleUrls: ['./pilot.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PilotComponent {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const router = inject(Router);
    const fragment = inject(ActivatedRoute).snapshot.fragment;
    router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof Scroll && event.anchor && !event.position) {
        const anchor = event.anchor;
        // Le défilement du routeur ignore scroll-margin-top.
        queueMicrotask(() => this.scrollTo(anchor, 'instant'));
      }
    });
    if (fragment) {
      afterNextRender(() => {
        // La position des sections dépend des polices chargées au premier rendu.
        void this.document.fonts.ready.then(() => {
          if (!destroyRef.destroyed) this.scrollTo(fragment, 'instant');
        });
      });
    }
  }

  // Modal contact / démo state
  readonly isModalOpen = signal(false);
  readonly formSubmitted = signal(false);

  // Formulaire de contact institutionnel
  contactForm = {
    name: '',
    structure: '',
    role: '',
    contact: '',
    message: ''
  };

  /** WhatsApp officiel DocTrack avec message pré-rempli */
  readonly whatsappUrl = 'https://wa.me/221761695784?text=' + encodeURIComponent(
    'Bonjour équipe DocTrack, nous souhaitons échanger au sujet d’une démonstration ou d’un projet pilote institutionnel pour notre structure.'
  );

  /** Email officiel DocTrack */
  readonly officialEmail = 'sendoctrack@gmail.com';

  /** Téléphone officiel DocTrack */
  readonly officialPhone = '+221 76 169 57 84';

  /** Lien mailto direct avec objet pré-rempli */
  readonly emailMailtoUrl = `mailto:${this.officialEmail}?subject=${encodeURIComponent('[DocTrack Pilote] Demande de démonstration')}`;

  /** Défilement fluide vers une section */
  scrollTo(id: string, behavior: ScrollBehavior = 'smooth'): void {
    const target = this.document.getElementById(id);
    if (!target || !this.host.contains(target)) return;
    const reducedMotion = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reducedMotion ? 'instant' : behavior, block: 'start' });
  }

  /** Ouverture du modal de démonstration / pilote */
  openDemoModal(): void {
    this.formSubmitted.set(false);
    this.isModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  /** Fermeture du modal */
  closeDemoModal(): void {
    this.isModalOpen.set(false);
    document.body.style.overflow = '';
  }

  /** Fermeture sur touche Échap */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isModalOpen()) {
      this.closeDemoModal();
    }
  }

  /** Soumission du formulaire institutionnel */
  submitForm(): void {
    if (!this.contactForm.name || !this.contactForm.structure || !this.contactForm.contact) {
      return;
    }

    const subject = encodeURIComponent(
      `[DocTrack Pilote] Demande de démonstration — ${this.contactForm.structure}`
    );
    const body = encodeURIComponent(
      `Nom : ${this.contactForm.name}\n` +
      `Structure : ${this.contactForm.structure}\n` +
      `Fonction : ${this.contactForm.role || 'Non spécifiée'}\n` +
      `Contact : ${this.contactForm.contact}\n\n` +
      `Message / Besoins :\n${this.contactForm.message || 'Souhaite organiser une démonstration ou échanger sur le pilote.'}`
    );

    // Ouvre le client mail avec les informations pré-remplies
    window.location.href = `mailto:${this.officialEmail}?subject=${subject}&body=${body}`;

    this.formSubmitted.set(true);
  }
}

