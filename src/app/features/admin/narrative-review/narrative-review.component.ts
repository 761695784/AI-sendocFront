import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../../../core/api/admin.api';
import { NarrativeEdits } from '../../../core/api/admin.types';
import { ActivityReport } from '../../../core/api/pilot.types';
import { NotifyService } from '../../../shared/feedback/notify.service';

type Priority = 'haute' | 'moyenne' | 'basse';
type RecoGroup = FormGroup<{ priority: FormControl<Priority>; text: FormControl<string> }>;

/** Compare la synthèse d'origine et le formulaire : on n'envoie que ce qui a changé. */
export function narrativeEdits(
  original: { summary_fr?: string; summary_en?: string; highlights?: string[]; recommendations?: { priority: Priority; text: string }[] },
  form: { summary_fr: string; summary_en: string; highlights: string; recommendations: { priority: Priority; text: string }[] },
): NarrativeEdits {
  const edits: NarrativeEdits = {};
  if (form.summary_fr.trim() !== (original.summary_fr ?? '').trim()) {
    edits.summary_fr = form.summary_fr.trim();
  }
  if (form.summary_en.trim() !== (original.summary_en ?? '').trim()) {
    edits.summary_en = form.summary_en.trim();
  }
  const highlights = form.highlights.split('\n').map((l) => l.trim()).filter(Boolean);
  if (JSON.stringify(highlights) !== JSON.stringify(original.highlights ?? [])) {
    edits.highlights = highlights;
  }
  const recos = form.recommendations.map((r) => ({ priority: r.priority, text: r.text.trim() })).filter((r) => r.text);
  if (JSON.stringify(recos) !== JSON.stringify(original.recommendations ?? [])) {
    edits.recommendations = recos;
  }
  return edits;
}

/**
 * Validation d'une synthèse rédigée par l'IA (super admin) : relire, corriger, approuver ;
 * ou rejeter (le rapport part avec l'analyse par règles seule) ; ou relancer la rédaction.
 * Rien n'est envoyé aux institutions tant que la synthèse n'est pas tranchée.
 */
@Component({
  selector: 'app-narrative-review',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dt-card nr">
      <div class="dt-card__head">
        <h2 class="dt-card__title mb-0"><i class="fas fa-robot me-1" aria-hidden="true"></i> Synthèse IA — validation</h2>
        <span class="badge" [class]="'text-bg-' + statusTone()">{{ statusLabel() }}</span>
      </div>

      @if (pending() && report().narrative; as n) {
        <p class="small dt-muted mt-2">
          Rédigée par <b>{{ n.provider }}</b>@if (n.model) { ({{ n.model }}) } à partir des seuls chiffres agrégés ;
          les nombres cités ont été vérifiés automatiquement. Corrigez si besoin, puis validez : le PDF et le fichier Excel
          sont refaits et le rapport est envoyé aux institutions.
        </p>
        <form class="dt-form" [formGroup]="form" (ngSubmit)="approve()">
          <label for="nr-fr" class="dt-required">Synthèse (français)</label>
          <textarea id="nr-fr" class="form-control" rows="5" formControlName="summary_fr"></textarea>
          @if (form.controls.summary_fr.invalid && form.controls.summary_fr.touched) { <small class="dt-error">20 caractères au moins.</small> }

          <label for="nr-hl" class="mt-2">Faits marquants (un par ligne)</label>
          <textarea id="nr-hl" class="form-control" rows="3" formControlName="highlights"></textarea>

          <p class="mt-2 mb-1 fw-semibold small">Recommandations</p>
          <div formArrayName="recommendations">
            @for (r of recos.controls; track $index; let i = $index) {
              <div class="d-flex gap-2 mb-2" [formGroupName]="i">
                <select class="form-select form-select-sm w-auto" formControlName="priority" [attr.aria-label]="'Priorité ' + (i + 1)">
                  <option value="haute">haute</option><option value="moyenne">moyenne</option><option value="basse">basse</option>
                </select>
                <input class="form-control form-control-sm" formControlName="text" [attr.aria-label]="'Recommandation ' + (i + 1)" />
                <button type="button" class="btn btn-sm btn-outline-secondary" (click)="removeReco(i)" [attr.aria-label]="'Retirer la recommandation ' + (i + 1)"><i class="fas fa-times" aria-hidden="true"></i></button>
              </div>
            }
          </div>
          @if (recos.length < 10) {
            <button type="button" class="btn btn-sm btn-link px-0" (click)="addReco()"><i class="fas fa-plus me-1" aria-hidden="true"></i>Ajouter une recommandation</button>
          }

          <details class="mt-2">
            <summary class="small">Version anglaise</summary>
            <textarea class="form-control mt-1" rows="4" formControlName="summary_en" aria-label="Synthèse en anglais"></textarea>
          </details>

          <label for="nr-note" class="mt-2">Note de relecture (facultative)</label>
          <input id="nr-note" class="form-control" formControlName="note" placeholder="Ex. relu, chiffres conformes" />

          <div class="d-flex flex-wrap gap-2 mt-3">
            <button type="submit" class="btn btn-dt" [disabled]="busy()"><i class="fas fa-check me-1" aria-hidden="true"></i> Valider et envoyer</button>
            <button type="button" class="btn btn-outline-danger" [disabled]="busy()" (click)="reject()">Rejeter</button>
            <button type="button" class="btn btn-outline-secondary" [disabled]="busy()" (click)="regenerate()">Rédiger à nouveau</button>
          </div>
        </form>
      } @else {
        <p class="small mt-2 mb-2">{{ explanation() }}</p>
        @if (report().narrative_review?.note) { <p class="small mb-2"><i class="fas fa-comment-alt me-1 dt-muted" aria-hidden="true"></i>{{ report().narrative_review!.note }}</p> }
        @if (canRegenerate()) {
          <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="busy()" (click)="regenerate()">
            <i class="fas fa-sync-alt me-1" aria-hidden="true"></i> {{ busy() ? 'Rédaction en cours…' : 'Lancer la rédaction' }}
          </button>
        }
      }

      @if (attempts().length) {
        <details class="mt-3">
          <summary class="small dt-muted">Tentatives de rédaction ({{ attempts().length }})</summary>
          <ul class="small mb-0 mt-1 ps-3">
            @for (a of attempts(); track $index) {
              <li>{{ a.provider }}@if (a.model) { ({{ a.model }}) } — @if (a.ok) { <span class="text-success">réussie</span> } @else { <span class="text-danger">échec : {{ a.error }}</span> }</li>
            }
          </ul>
        </details>
      }
    </section>
  `,
  styles: `.nr { border-left: 4px solid #31287c; }`,
})
export class NarrativeReviewComponent {
  private readonly api = inject(AdminApi);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly report = input.required<ActivityReport>();
  readonly updated = output<ActivityReport>();
  readonly busy = signal(false);

  readonly pending = computed(() => this.report().narrative_status === 'pending');
  readonly attempts = computed(() => this.report().narrative_review?.attempts ?? []);
  readonly canRegenerate = computed(() => {
    const r = this.report();
    return !(r.delivered_at && r.narrative_status === 'approved');
  });
  readonly statusLabel = computed(
    () => ({ pending: 'À valider', approved: 'Validée', rejected: 'Rejetée', failed: 'Échec de rédaction', none: 'Aucune' })[this.report().narrative_status ?? 'none'] ?? '—',
  );
  readonly statusTone = computed(
    () => ({ pending: 'warning', approved: 'success', rejected: 'secondary', failed: 'danger', none: 'light' })[this.report().narrative_status ?? 'none'] ?? 'light',
  );
  readonly explanation = computed(() => {
    switch (this.report().narrative_status) {
      case 'approved':
        return 'Synthèse validée : elle figure dans le PDF et le fichier Excel envoyés.';
      case 'rejected':
        return 'Synthèse rejetée : le rapport est parti avec l’analyse par règles seule. Vous pouvez relancer une rédaction.';
      case 'failed':
        return 'Aucun modèle n’a produit de synthèse fiable (voir les tentatives). Le rapport chiffré fait foi.';
      default:
        return 'Pas de synthèse rédigée : la rédaction par l’IA n’est pas activée, ou aucune clé n’est configurée sur le serveur.';
    }
  });

  readonly form = this.fb.nonNullable.group({
    summary_fr: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(5000)]],
    summary_en: ['', Validators.maxLength(5000)],
    highlights: [''],
    recommendations: this.fb.array<RecoGroup>([]),
    note: ['', Validators.maxLength(500)],
  });

  get recos() {
    return this.form.controls.recommendations;
  }

  constructor() {
    // Formulaire rempli avec la synthèse reçue (et de nouveau après « Rédiger à nouveau »).
    effect(() => {
      const n = this.report().narrative;
      untracked(() => {
        this.recos.clear();
        this.form.reset({ summary_fr: n?.summary_fr ?? '', summary_en: n?.summary_en ?? '', highlights: (n?.highlights ?? []).join('\n'), note: '' });
        (n?.recommendations ?? []).forEach((r) => this.recos.push(this.recoGroup(r.priority, r.text)));
      });
    });
  }

  private recoGroup(priority: Priority = 'moyenne', text = ''): RecoGroup {
    return this.fb.nonNullable.group({ priority: [priority], text: [text, Validators.maxLength(500)] });
  }

  addReco(): void {
    this.recos.push(this.recoGroup());
  }

  removeReco(i: number): void {
    this.recos.removeAt(i);
  }

  async approve(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const edits = narrativeEdits(this.report().narrative ?? {}, v);
    const ok = await this.notify.confirm({
      title: 'Valider la synthèse ?',
      text: Object.keys(edits).length
        ? 'Vos corrections seront intégrées, puis le rapport sera envoyé aux institutions.'
        : 'Le rapport sera envoyé aux institutions avec cette synthèse.',
      confirmText: 'Valider et envoyer',
    });
    if (!ok) {
      return;
    }
    this.run(this.api.approveNarrative(this.report().uuid, { ...edits, note: v.note.trim() || undefined }), 'Synthèse validée, rapport envoyé.');
  }

  async reject(): Promise<void> {
    const note = await this.notify.confirmWithNote({
      title: 'Rejeter la synthèse ?',
      text: 'Le rapport sera envoyé avec l’analyse par règles seule.',
      label: 'Motif (obligatoire)',
      required: true,
      confirmText: 'Rejeter',
      danger: true,
    });
    if (note === null) {
      return;
    }
    if (note.length < 5) {
      void this.notify.error('Le motif doit contenir au moins 5 caractères.');
      return;
    }
    this.run(this.api.rejectNarrative(this.report().uuid, note), 'Synthèse rejetée.');
  }

  async regenerate(): Promise<void> {
    const ok = await this.notify.confirm({ title: 'Rédiger à nouveau la synthèse ?', text: 'Les modèles configurés sont sollicités ; cela peut prendre une minute.', confirmText: 'Lancer' });
    if (!ok) {
      return;
    }
    this.run(this.api.regenerateNarrative(this.report().uuid), 'Rédaction terminée.');
  }

  private run(request: ReturnType<AdminApi['approveNarrative']>, message: string): void {
    this.busy.set(true);
    request.subscribe({
      next: (r) => {
        this.busy.set(false);
        this.notify.success(message);
        this.updated.emit(r);
      },
      error: (e) => {
        this.busy.set(false);
        void this.notify.error(e);
      },
    });
  }
}
