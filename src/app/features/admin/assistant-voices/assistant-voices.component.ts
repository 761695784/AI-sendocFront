import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AdminApi } from '../../../core/api/admin.api';
import { AssistantVoice, AssistantVoices, VoiceState } from '../../../core/api/admin.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';

const STATES: Record<VoiceState, { label: string; tone: string; icon: string }> = {
  ready: { label: 'Prête', tone: 'success', icon: 'fa-check-circle' },
  stale: { label: 'À refaire', tone: 'warning', icon: 'fa-exclamation-triangle' },
  missing: { label: 'Sans voix', tone: 'secondary', icon: 'fa-volume-mute' },
  manual: { label: 'Déposée à la main', tone: 'info', icon: 'fa-file-audio' },
};

/** Phrases à faire lire quand on clique « Générer ce qui manque » : celles sans audio ou dont le texte a changé. */
export function voicesToGenerate(voices: Pick<AssistantVoice, 'key' | 'state'>[]): string[] {
  return voices.filter((v) => v.state === 'missing' || v.state === 'stale').map((v) => v.key);
}

/**
 * Voix de l'assistant (super admin). Les phrases fixes de l'assistant sont lues UNE fois par Adia_TTS
 * (réseau entraîné sur 40 h de voix wolof, qui génère l'audio), enregistrées en MP3, puis servies comme des fichiers.
 * Ici : écouter chaque phrase, générer celles qui manquent, refaire ou retirer une phrase mal prononcée.
 */
@Component({
  selector: 'app-admin-assistant-voices',
  imports: [DatePipe, DecimalPipe, PageHeaderComponent, LoadingComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Voix de l'assistant" subtitle="Réponses parlées en wolof, générées par le modèle Adia_TTS (CONCREE)">
      @if (voices()?.can_generate && todo().length && !running()) {
        <button type="button" class="btn btn-dt" (click)="generateAll()">
          <i class="fas fa-magic me-1" aria-hidden="true"></i> Générer ce qui manque ({{ todo().length }})
        </button>
      }
      @if (running()) {
        <button type="button" class="btn btn-outline-danger" (click)="stop.set(true)">Arrêter après cette phrase</button>
      }
    </app-page-header>

    <div class="dt-callout dt-callout--info mt-0 mb-3"><i class="fas fa-info-circle" aria-hidden="true"></i>
      <div>
        <strong>Comment ça marche</strong>
        Adia_TTS est un réseau de neurones entraîné sur 40 heures de voix wolof : il <b>fabrique</b> le son à partir du texte,
        ce ne sont pas des enregistrements collés. L'assistant dit toujours les mêmes phrases : chacune est lue <b>une seule fois</b>,
        puis rejouée instantanément. Les phrases contenant un nom ou un numéro de dossier ne sont jamais envoyées au modèle : elles restent en texte.
      </div>
    </div>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">Réessayer</button></app-error-state>
    } @else if (voices(); as v) {
      @if (!v.can_generate) {
        <div class="dt-callout dt-callout--warning mt-0 mb-3"><i class="fas fa-plug" aria-hidden="true"></i>
          <div>
            <strong>Service de synthèse non branché.</strong>
            Mettez en ligne le service <span class="dt-mono">doctrack-tts</span> (dossier <span class="dt-mono">ai/doctrack-tts</span> de l'API) sur Hugging Face,
            puis renseignez <span class="dt-mono">AI_TTS_PROVIDER=hf_space</span>, <span class="dt-mono">AI_TTS_URL</span> et <span class="dt-mono">AI_TTS_TOKEN</span>
            dans le <span class="dt-mono">.env</span> de l'API. Vous pouvez déjà écouter les voix existantes.
          </div>
        </div>
      }

      <section class="dt-stats" aria-label="État des voix">
        <div class="dt-stat"><span class="dt-stat__icon dt-stat__icon--purple"><i class="fas fa-comment-dots" aria-hidden="true"></i></span><div class="dt-stat__body"><strong class="dt-stat__num">{{ v.summary.total }}</strong><span class="dt-stat__label">Phrases fixes</span></div></div>
        <div class="dt-stat"><span class="dt-stat__icon dt-stat__icon--green"><i class="fas fa-check-circle" aria-hidden="true"></i></span><div class="dt-stat__body"><strong class="dt-stat__num">{{ v.summary.ready + v.summary.manual }}</strong><span class="dt-stat__label">Voix prêtes</span></div></div>
        <div class="dt-stat" [class.dt-stat--warn]="v.summary.stale > 0"><span class="dt-stat__icon dt-stat__icon--gold"><i class="fas fa-redo" aria-hidden="true"></i></span><div class="dt-stat__body"><strong class="dt-stat__num">{{ v.summary.stale }}</strong><span class="dt-stat__label">À refaire (texte corrigé)</span></div></div>
        <div class="dt-stat"><span class="dt-stat__icon dt-stat__icon--red"><i class="fas fa-volume-mute" aria-hidden="true"></i></span><div class="dt-stat__body"><strong class="dt-stat__num">{{ v.summary.missing }}</strong><span class="dt-stat__label">Sans voix</span></div></div>
      </section>

      @if (running()) {
        <div class="vx-progress" role="status">
          <div class="progress" style="height: .6rem"><div class="progress-bar" [style.width.%]="(done() / planned()) * 100"></div></div>
          <small>Génération {{ done() }} / {{ planned() }} — phrase « {{ busy() }} ». Sur le service gratuit : 30 s à 2 min par phrase. Gardez cette page ouverte.</small>
        </div>
      }

      <div class="dt-card p-0 overflow-hidden mt-3">
        <ul class="list-unstyled mb-0">
          @for (p of v.data; track p.key) {
            <li class="vx-row">
              <div class="vx-row__text">
                <p class="mb-1" lang="wo">{{ p.text }}</p>
                <small class="dt-muted">
                  <span class="dt-mono">{{ p.key }}</span>
                  @if (p.model) { · {{ p.model }} }
                  @if (p.duration) { · {{ p.duration | number: '1.0-1' }} s }
                  @if (p.generated_at) { · {{ p.generated_at | date: 'd MMM y, HH:mm' }} }
                </small>
                @if (p.state === 'stale' && p.spoken_text) {
                  <small class="d-block text-warning-emphasis mt-1"><i class="fas fa-exclamation-triangle me-1" aria-hidden="true"></i>
                    L'ancien audio dit encore : « <span lang="wo">{{ p.spoken_text }}</span> ». Il n'est plus proposé aux citoyens.</small>
                }
              </div>
              <div class="vx-row__side">
                <span class="badge" [class]="'text-bg-' + states[p.state].tone"><i class="fas {{ states[p.state].icon }} me-1" aria-hidden="true"></i>{{ states[p.state].label }}</span>
                @if (p.audio_url) {
                  <audio controls preload="none" [src]="p.audio_url" [attr.aria-label]="'Écouter ' + p.key"></audio>
                }
                <div class="d-flex gap-1">
                  @if (v.can_generate) {
                    <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="!!busy()" (click)="generate(p)">
                      {{ busy() === p.key ? 'Lecture par le modèle…' : (p.state === 'missing' ? 'Générer' : 'Refaire') }}
                    </button>
                  }
                  @if (p.audio_url) {
                    <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="!!busy()" (click)="remove(p)" [attr.aria-label]="'Retirer la voix de ' + p.key">Retirer</button>
                  }
                </div>
              </div>
            </li>
          }
        </ul>
      </div>
      <p class="small dt-muted mt-2">
        Le modèle ne lit que le wolof : les réponses en français restent en texte. Faites écouter chaque phrase à un locuteur natif ;
        si elle sonne mal, corrigez son texte dans <span class="dt-mono">config/assistant.php</span> (phrases simples, sans sigle), puis « Refaire ».
      </p>
    }
  `,
  styles: `
    .vx-progress { margin-top: 1rem; }
    .vx-progress small { color: #5f6b7a; }
    .vx-row { display: flex; flex-wrap: wrap; gap: .75rem 1.25rem; padding: .9rem 1.1rem; align-items: center; }
    .vx-row + .vx-row { border-top: 1px solid #eef1f5; }
    .vx-row__text { flex: 1 1 320px; min-width: 0; }
    .vx-row__side { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; }
    audio { height: 2.2rem; max-width: 260px; }
  `,
})
export class AdminAssistantVoicesComponent implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly notify = inject(NotifyService);

  readonly states = STATES;
  readonly voices = signal<AssistantVoices | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** Clé de la phrase en cours de génération. */
  readonly busy = signal<string | null>(null);
  readonly running = signal(false);
  readonly stop = signal(false);
  readonly done = signal(0);
  readonly planned = signal(1);

  readonly todo = computed(() => voicesToGenerate(this.voices()?.data ?? []));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.assistantVoices('wo').subscribe({
      next: (v) => {
        this.voices.set(v);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  /** Remplace une ligne et recalcule les compteurs sans recharger toute la liste. */
  private patch(row: AssistantVoice): void {
    this.voices.update((v) => {
      if (!v) {
        return v;
      }
      const data = v.data.map((x) => (x.key === row.key ? row : x));
      const count = (s: VoiceState) => data.filter((x) => x.state === s).length;
      return { ...v, data, summary: { total: data.length, ready: count('ready'), stale: count('stale'), missing: count('missing'), manual: count('manual') } };
    });
  }

  private generateOne(key: string): Promise<boolean> {
    this.busy.set(key);
    return new Promise((resolve) => {
      this.api.generateVoice('wo', key).subscribe({
        next: (row) => {
          this.busy.set(null);
          this.patch(row);
          resolve(true);
        },
        error: (e) => {
          this.busy.set(null);
          void this.notify.error(e, 'Voix non générée');
          resolve(false);
        },
      });
    });
  }

  async generate(p: AssistantVoice): Promise<void> {
    if (await this.generateOne(p.key)) {
      this.notify.success('Voix prête : écoutez-la.');
    }
  }

  /** Une phrase après l'autre (le service gratuit n'en calcule qu'une à la fois) ; s'arrête au premier échec. */
  async generateAll(): Promise<void> {
    const keys = this.todo();
    const ok = await this.notify.confirm({
      title: `Faire lire ${keys.length} phrase(s) par le modèle ?`,
      text: 'Sur le service gratuit, comptez 30 secondes à 2 minutes par phrase. Gardez cette page ouverte ; vous pouvez arrêter à tout moment.',
      confirmText: 'Lancer',
    });
    if (!ok) {
      return;
    }
    this.running.set(true);
    this.stop.set(false);
    this.done.set(0);
    this.planned.set(keys.length);
    for (const key of keys) {
      if (this.stop() || !(await this.generateOne(key))) {
        break;
      }
      this.done.update((n) => n + 1);
    }
    this.running.set(false);
    if (this.done() === keys.length) {
      this.notify.success('Toutes les voix sont prêtes.');
    }
  }

  async remove(p: AssistantVoice): Promise<void> {
    const ok = await this.notify.confirm({ title: 'Retirer cette voix ?', text: 'L’assistant affichera cette phrase en texte seulement, jusqu’à ce qu’elle soit régénérée.', confirmText: 'Retirer', danger: true });
    if (!ok) {
      return;
    }
    this.api.removeVoice('wo', p.key).subscribe({
      next: (row) => {
        this.patch(row);
        this.notify.success('Voix retirée.');
      },
      error: (e) => void this.notify.error(e),
    });
  }
}
