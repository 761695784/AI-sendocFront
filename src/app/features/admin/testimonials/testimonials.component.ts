import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModeratedTestimonial, TestimonialEdits, TestimonialStatus, TestimonialsApi } from '../../../core/api/testimonials.api';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Document retrouvé',
  finder: 'Document rendu',
  other: 'Autre',
};

/** Champs modifiables avant publication (fautes, prénom, ville). */
export function testimonialEdits(original: ModeratedTestimonial, draft: { first_name: string; city: string; body: string }): TestimonialEdits {
  const edits: TestimonialEdits = {};
  for (const key of ['first_name', 'city', 'body'] as const) {
    const value = draft[key].trim();
    if (value && value !== original[key]) {
      edits[key] = value;
    }
  }
  return edits;
}

/**
 * Témoignages (super admin) : chaque témoignage reçu attend une relecture.
 * Valider le publie sur la page d'accueil (prénom, ville, note, texte) ; le contact n'est jamais publié.
 */
@Component({
  selector: 'app-admin-testimonials',
  imports: [DatePipe, UpperCasePipe, FormsModule, PageHeaderComponent, LoadingComponent, ErrorStateComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Témoignages" subtitle="Relire, corriger puis publier les témoignages des usagers" icon="fa-comment-dots" />

    <ul class="nav nav-pills mb-3" role="tablist">
      @for (tab of tabs; track tab.status) {
        <li class="nav-item">
          <button type="button" class="nav-link" [class.active]="status() === tab.status" (click)="show(tab.status)">
            {{ tab.label }} <span class="badge text-bg-light ms-1">{{ counts()[tab.status] ?? 0 }}</span>
          </button>
        </li>
      }
    </ul>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">Réessayer</button></app-error-state>
    } @else if (!items().length) {
      <app-empty-state icon="fa-comment-dots" [title]="status() === 'pending' ? 'Aucun témoignage à relire' : 'Aucun témoignage'"
        text="Les témoignages envoyés depuis la page « Partager mon témoignage » arrivent ici, et par e-mail." />
    } @else {
      @for (t of items(); track t.uuid) {
        <article class="tm card mb-3">
          <div class="card-body">
            <header class="tm__head">
              <div>
                <strong>{{ t.first_name }}</strong> · {{ t.city }}
                <span class="badge text-bg-light ms-1">{{ roleLabel(t.role) }}</span>
                @if (t.rating) { <span class="tm__stars ms-1" [attr.aria-label]="t.rating + ' sur 5'">{{ starsOf(t.rating) }}</span> }
                @if (t.verified) { <span class="badge text-bg-success ms-1"><i class="fas fa-check-circle me-1" aria-hidden="true"></i>Restitution vérifiée</span> }
              </div>
              <small class="text-muted">Reçu le {{ t.created_at | date: 'd MMM y, HH:mm' }} · {{ t.locale | uppercase }}</small>
            </header>

            @if (editing() === t.uuid) {
              <div class="row g-2 my-2">
                <div class="col-md-6"><label class="form-label small" for="ed-first-{{ t.uuid }}">Prénom</label>
                  <input id="ed-first-{{ t.uuid }}" class="form-control" [(ngModel)]="draft.first_name" /></div>
                <div class="col-md-6"><label class="form-label small" for="ed-city-{{ t.uuid }}">Ville</label>
                  <input id="ed-city-{{ t.uuid }}" class="form-control" [(ngModel)]="draft.city" /></div>
                <div class="col-12"><label class="form-label small" for="ed-body-{{ t.uuid }}">Texte</label>
                  <textarea id="ed-body-{{ t.uuid }}" class="form-control" rows="4" maxlength="500" [(ngModel)]="draft.body"></textarea></div>
              </div>
            } @else {
              <blockquote class="tm__body">« {{ t.body }} »</blockquote>
            }

            <dl class="tm__meta">
              <div><dt>Contact (jamais publié)</dt><dd>{{ t.contact || '—' }}</dd></div>
              <div><dt>Compte</dt><dd>{{ t.account ? t.account.name + (t.account.email ? ' — ' + t.account.email : '') : 'Visiteur sans compte' }}</dd></div>
              @if (t.declaration) { <div><dt>Déclaration</dt><dd class="dt-mono">{{ t.declaration }}</dd></div> }
              @if (t.moderated_at) { <div><dt>Décision</dt><dd>{{ t.moderator || '—' }}, le {{ t.moderated_at | date: 'd MMM y' }}{{ t.moderation_note ? ' — ' + t.moderation_note : '' }}</dd></div> }
            </dl>

            <div class="tm__actions">
              @if (editing() === t.uuid) {
                <button type="button" class="btn btn-dt btn-sm" [disabled]="busy() === t.uuid" (click)="saveEdits(t)">Enregistrer les corrections</button>
                <button type="button" class="btn btn-link btn-sm" (click)="editing.set(null)">Annuler</button>
              } @else {
                @if (t.status !== 'approved') {
                  <button type="button" class="btn btn-success btn-sm" [disabled]="busy() === t.uuid" (click)="decide(t, 'approved')"><i class="fas fa-check me-1" aria-hidden="true"></i>Publier</button>
                }
                @if (t.status !== 'rejected') {
                  <button type="button" class="btn btn-outline-danger btn-sm" [disabled]="busy() === t.uuid" (click)="decide(t, 'rejected')"><i class="fas fa-times me-1" aria-hidden="true"></i>{{ t.status === 'approved' ? 'Retirer du site' : 'Refuser' }}</button>
                }
                <button type="button" class="btn btn-outline-secondary btn-sm" (click)="edit(t)"><i class="fas fa-pen me-1" aria-hidden="true"></i>Corriger</button>
                <button type="button" class="btn btn-link text-danger btn-sm ms-auto" (click)="remove(t)">Supprimer</button>
              }
            </div>
          </div>
        </article>
      }
      @if (lastPage() > 1) {
        <nav class="d-flex gap-2 justify-content-center" aria-label="Pages">
          <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="page() <= 1" (click)="go(page() - 1)">Précédent</button>
          <span class="align-self-center small">Page {{ page() }} / {{ lastPage() }}</span>
          <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="page() >= lastPage()" (click)="go(page() + 1)">Suivant</button>
        </nav>
      }
    }
  `,
  styles: `
    .tm { border-radius: 14px; border-color: #ebe8f6; }
    .tm__head { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .tm__stars { color: #F6A500; letter-spacing: 1px; }
    .tm__body { margin: 12px 0; font-size: 1rem; color: #2f2a4f; white-space: pre-line; }
    .tm__meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px 16px; font-size: .85rem; margin: 0 0 12px; }
    .tm__meta dt { color: #6b7280; font-weight: 500; }
    .tm__meta dd { margin: 0; }
    .tm__actions { display: flex; gap: 8px; flex-wrap: wrap; }
  `,
})
export class AdminTestimonialsComponent implements OnInit {
  private readonly api = inject(TestimonialsApi);
  private readonly notify = inject(NotifyService);

  readonly tabs: { status: TestimonialStatus; label: string }[] = [
    { status: 'pending', label: 'À relire' },
    { status: 'approved', label: 'Publiés' },
    { status: 'rejected', label: 'Refusés' },
  ];

  readonly status = signal<TestimonialStatus>('pending');
  readonly items = signal<ModeratedTestimonial[]>([]);
  readonly counts = signal<Partial<Record<TestimonialStatus, number>>>({});
  readonly page = signal(1);
  readonly lastPage = signal(1);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal<string | null>(null);
  readonly editing = signal<string | null>(null);
  draft = { first_name: '', city: '', body: '' };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.moderation(this.status(), this.page()).subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.counts.set(r.counts ?? {});
        this.lastPage.set(r.meta?.last_page ?? 1);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  show(status: TestimonialStatus): void {
    this.status.set(status);
    this.page.set(1);
    this.editing.set(null);
    this.load();
  }

  go(page: number): void {
    this.page.set(page);
    this.load();
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role;
  }

  starsOf(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  edit(t: ModeratedTestimonial): void {
    this.draft = { first_name: t.first_name, city: t.city, body: t.body };
    this.editing.set(t.uuid);
  }

  saveEdits(t: ModeratedTestimonial): void {
    const edits = testimonialEdits(t, this.draft);
    if (!Object.keys(edits).length) {
      this.editing.set(null);
      return;
    }
    this.apply(t, edits, 'Corrections enregistrées.');
  }

  async decide(t: ModeratedTestimonial, status: 'approved' | 'rejected'): Promise<void> {
    if (status === 'approved') {
      const ok = await this.notify.confirm({
        title: 'Publier ce témoignage ?',
        text: `Il apparaîtra sur la page d'accueil avec le prénom « ${t.first_name} » et la ville « ${t.city} ». Le contact reste privé.`,
        confirmText: 'Publier',
      });
      if (ok) {
        this.apply(t, { status }, 'Témoignage publié.');
      }
      return;
    }
    const note = await this.notify.prompt({
      title: t.status === 'approved' ? 'Retirer ce témoignage du site ?' : 'Refuser ce témoignage ?',
      text: 'Motif facultatif, visible seulement par l\'équipe DocTrack.',
      confirmText: t.status === 'approved' ? 'Retirer' : 'Refuser',
    });
    if (note === null) {
      return; // annulé
    }
    this.apply(t, { status, moderation_note: note || null }, t.status === 'approved' ? 'Témoignage retiré du site.' : 'Témoignage refusé.');
  }

  async remove(t: ModeratedTestimonial): Promise<void> {
    const ok = await this.notify.confirm({ title: 'Supprimer ce témoignage ?', text: 'Il sera effacé définitivement.', confirmText: 'Supprimer', danger: true });
    if (!ok) {
      return;
    }
    this.api.remove(t.uuid).subscribe({
      next: () => {
        this.notify.success('Témoignage supprimé.');
        this.load();
      },
      error: (e) => void this.notify.error(e),
    });
  }

  private apply(t: ModeratedTestimonial, edits: TestimonialEdits, message: string): void {
    this.busy.set(t.uuid);
    this.api.update(t.uuid, edits).subscribe({
      next: () => {
        this.busy.set(null);
        this.editing.set(null);
        this.notify.success(message);
        this.load();
      },
      error: (e) => {
        this.busy.set(null);
        void this.notify.error(e);
      },
    });
  }
}
