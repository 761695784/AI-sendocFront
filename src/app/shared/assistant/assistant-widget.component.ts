import { ChangeDetectionStrategy, Component, ElementRef, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Réponse de POST /api/v2/assistant/messages. */
interface AssistantMessage { key: string; text: string; audio_url: string | null }
interface QuickReply { label: string; value: string }
interface AssistantCard { type: string; data: Record<string, any> }
interface AssistantResponse {
  conversation: { id: string; language: string; flow: string | null; step: string | null; status: string };
  reply: { messages: AssistantMessage[]; quick_replies: QuickReply[]; card: AssistantCard | null };
}

interface ChatLine {
  from: 'bot' | 'me';
  text: string;
  ai?: boolean;
  card?: AssistantCard | null;
}

const STORAGE_KEY = 'doctrack-assistant-conversation';
/** Valeur du bouton « Partager ma position » (voir AssistantEngine::POSITION côté API). */
const POSITION_VALUE = '__position__';
/** Pages où la bulle n'apparaît pas (espaces de travail des agents et de l'administration). */
const HIDDEN_PREFIXES = ['/espace', '/admin'];

/**
 * Assistant DocTrack : bulle de discussion en bas à droite des pages publiques et de l'espace citoyen.
 * Réponses par le dialogue guidé et les fiches d'aide de l'API ; rien n'est chargé tant qu'on ne l'ouvre pas.
 */
@Component({
  selector: 'app-assistant-widget',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      @if (!open()) {
        <button type="button" class="aw-fab" (click)="toggle()" aria-label="Ouvrir l'assistant DocTrack">
          <i class="fas fa-comment-dots" aria-hidden="true"></i>
          <span class="aw-fab__dot" aria-hidden="true"></span>
          <span class="aw-fab__label">Une question ?</span>
        </button>
      } @else {
        <section class="aw-panel" role="dialog" aria-label="Assistant DocTrack" aria-modal="false">
          <header class="aw-head">
            <div class="aw-head__avatar" aria-hidden="true"><i class="fas fa-robot"></i></div>
            <div class="aw-head__titles">
              <strong>Assistant DocTrack</strong>
              <span>Réponses automatiques · vérifiez les informations importantes</span>
            </div>
            <button type="button" class="aw-icon" (click)="restart()" title="Nouvelle conversation" aria-label="Nouvelle conversation">
              <i class="fas fa-redo-alt" aria-hidden="true"></i>
            </button>
            <button type="button" class="aw-icon" (click)="toggle()" aria-label="Fermer l'assistant">
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </header>

          <div class="aw-body" #body aria-live="polite">
            @for (line of lines(); track $index) {
              <div class="aw-msg" [class.aw-msg--me]="line.from === 'me'" [class.aw-msg--ai]="line.ai">
                <p>{{ line.text }}</p>
              </div>
              @if (line.card; as card) {
                @switch (card.type) {
                  @case ('links') {
                    <div class="aw-links">
                      @for (link of card.data['links']; track link.url) {
                        <a [routerLink]="link.url" (click)="onNavigate()" class="aw-link"><i class="fas fa-arrow-right" aria-hidden="true"></i> {{ link.label }}</a>
                      }
                    </div>
                  }
                  @case ('structure') {
                    <div class="aw-card">
                      <strong>{{ card.data['name'] }}</strong>
                      @if (card.data['address']) { <span>{{ card.data['address'] }}</span> }
                      @if (card.data['phone']) { <a [href]="'tel:' + card.data['phone']">{{ card.data['phone'] }}</a> }
                    </div>
                  }
                  @case ('login_required') {
                    <div class="aw-links">
                      <a routerLink="/connexion" (click)="onNavigate()" class="aw-link"><i class="fas fa-sign-in-alt" aria-hidden="true"></i> Se connecter</a>
                      <a routerLink="/inscription" (click)="onNavigate()" class="aw-link"><i class="fas fa-user-plus" aria-hidden="true"></i> Créer un compte</a>
                    </div>
                  }
                  @case ('declaration_created') {
                    <div class="aw-links">
                      <a routerLink="/mon-espace" (click)="onNavigate()" class="aw-link"><i class="fas fa-folder-open" aria-hidden="true"></i> Voir ma déclaration {{ card.data['reference'] }}</a>
                    </div>
                  }
                  @case ('open_form') {
                    <div class="aw-links">
                      <a routerLink="/publier" (click)="onNavigate()" class="aw-link"><i class="fas fa-camera" aria-hidden="true"></i> Ouvrir le formulaire de publication</a>
                    </div>
                  }
                }
              }
            }
            @if (sending()) {
              <div class="aw-msg aw-typing" aria-label="L'assistant écrit"><span></span><span></span><span></span></div>
            }
          </div>

          @if (quickReplies().length && !sending()) {
            <div class="aw-quick">
              @for (q of quickReplies(); track q.value) {
                <button type="button" (click)="send(q.value, q.label, 'button')">{{ q.label }}</button>
              }
            </div>
          }

          <form class="aw-input" (submit)="$event.preventDefault(); sendTyped(input)">
            <label class="visually-hidden" for="aw-text">Votre question</label>
            <input #input id="aw-text" type="text" maxlength="500" autocomplete="off" placeholder="Posez votre question…" [disabled]="sending()">
            <button type="submit" [disabled]="sending()" aria-label="Envoyer"><i class="fas fa-paper-plane" aria-hidden="true"></i></button>
          </form>
          <p class="aw-foot">Ne partagez jamais le numéro de votre pièce, un mot de passe ou un code reçu par SMS.</p>
        </section>
      }
    }
  `,
  styles: `
    :host { --v: #31287C; --o: #F6A500; }
    .aw-fab { position: fixed; right: 20px; bottom: calc(20px + env(safe-area-inset-bottom)); z-index: 1900; display: flex; align-items: center; gap: .55rem;
      border: 0; border-radius: 999px; background: var(--v); color: #fff; padding: .8rem 1.1rem .8rem .95rem; font: 600 .95rem 'Poppins', sans-serif;
      box-shadow: 0 10px 28px rgba(49,40,124,.35); cursor: pointer; transition: transform .15s; }
    .aw-fab:hover { transform: translateY(-2px); }
    .aw-fab i { font-size: 1.25rem; color: var(--o); }
    .aw-fab__dot { position: absolute; top: 8px; left: 30px; width: 9px; height: 9px; border-radius: 50%; background: var(--o); border: 2px solid var(--v); }
    @media (max-width: 480px) { .aw-fab__label { display: none; } .aw-fab { padding: .95rem; } }

    .aw-panel { position: fixed; right: 20px; bottom: 20px; z-index: 1950; width: 370px; height: min(600px, calc(100vh - 40px)); display: flex; flex-direction: column;
      background: #fff; border-radius: 18px; box-shadow: 0 18px 50px rgba(31,24,87,.3); overflow: hidden; font-family: 'Poppins', sans-serif; }
    @media (max-width: 480px) { .aw-panel { inset: 0; width: auto; height: auto; border-radius: 0; } }

    .aw-head { display: flex; align-items: center; gap: .7rem; padding: .85rem .9rem; background: var(--v); color: #fff; border-bottom: 3px solid var(--o); }
    .aw-head__avatar { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,.12); display: grid; place-items: center; color: var(--o); flex: none; }
    .aw-head__titles { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .aw-head__titles strong { font-size: .98rem; }
    .aw-head__titles span { font-size: .72rem; opacity: .8; }
    .aw-icon { border: 0; background: transparent; color: #fff; width: 34px; height: 34px; border-radius: 10px; cursor: pointer; }
    .aw-icon:hover { background: rgba(255,255,255,.12); }

    .aw-body { flex: 1; overflow-y: auto; padding: 1rem .9rem; background: #f4f3fb; display: flex; flex-direction: column; gap: .55rem; }
    .aw-msg { max-width: 86%; align-self: flex-start; background: #fff; border: 1px solid #e8e6f5; border-radius: 14px 14px 14px 4px; padding: .6rem .8rem; }
    .aw-msg p { margin: 0; font-size: .88rem; line-height: 1.5; color: #2a2c3c; white-space: pre-line; }
    .aw-msg--me { align-self: flex-end; background: var(--v); border-color: var(--v); border-radius: 14px 14px 4px 14px; }
    .aw-msg--me p { color: #fff; }
    .aw-msg--ai { background: #fff6e0; border-color: #f3d68a; }
    .aw-msg--ai p { font-size: .76rem; color: #7a5a00; }

    .aw-links { display: flex; flex-direction: column; gap: .35rem; align-self: flex-start; max-width: 86%; }
    .aw-link { display: inline-flex; align-items: center; gap: .45rem; background: #fff; border: 1px solid var(--v); color: var(--v); border-radius: 10px;
      padding: .45rem .7rem; font-size: .82rem; font-weight: 600; text-decoration: none; }
    .aw-link:hover { background: var(--v); color: #fff; }
    .aw-card { align-self: flex-start; max-width: 86%; display: flex; flex-direction: column; gap: .15rem; background: #fff; border-left: 4px solid var(--o);
      border-radius: 10px; padding: .55rem .75rem; font-size: .84rem; color: #2a2c3c; }
    .aw-card a { color: var(--v); font-weight: 600; }

    .aw-typing { display: flex; gap: 4px; padding: .75rem .9rem; }
    .aw-typing span { width: 7px; height: 7px; border-radius: 50%; background: #b4add9; animation: aw-dot 1s infinite ease-in-out; }
    .aw-typing span:nth-child(2) { animation-delay: .15s; } .aw-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes aw-dot { 0%, 80%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }

    .aw-quick { display: flex; flex-wrap: nowrap; overflow-x: auto; gap: .4rem; padding: .6rem .9rem .1rem; background: #fff; scrollbar-width: none; }
    .aw-quick::-webkit-scrollbar { display: none; }
    .aw-quick button { flex: none; white-space: nowrap; border: 1px solid #d9d5f0; background: #faf9ff; color: var(--v); border-radius: 999px; padding: .35rem .75rem; font: 600 .78rem 'Poppins', sans-serif; cursor: pointer; }
    .aw-quick button:hover { border-color: var(--v); background: #f0eeff; }

    .aw-input { display: flex; gap: .5rem; padding: .7rem .9rem .4rem; background: #fff; }
    .aw-input input { flex: 1; border: 1px solid #d9d5f0; border-radius: 12px; padding: .6rem .8rem; font: .9rem 'Poppins', sans-serif; outline: none; }
    .aw-input input:focus { border-color: var(--v); box-shadow: 0 0 0 3px rgba(49,40,124,.12); }
    .aw-input button { border: 0; width: 42px; border-radius: 12px; background: var(--o); color: var(--v); cursor: pointer; }
    .aw-input button:disabled { opacity: .5; }
    .aw-foot { margin: 0; padding: 0 .9rem .7rem; background: #fff; font-size: .68rem; color: #8a93a2; }
  `,
})
export class AssistantWidgetComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');

  readonly open = signal(false);
  readonly sending = signal(false);
  readonly lines = signal<ChatLine[]>([]);
  readonly quickReplies = signal<QuickReply[]>([]);
  private readonly url = signal(this.router.url);
  private conversationId: string | null = null;

  /** Bulle visible côté navigateur uniquement, hors espaces agents / administration. */
  readonly visible = computed(() => this.browser && !HIDDEN_PREFIXES.some((p) => this.url().startsWith(p)));

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => this.url.set((e as NavigationEnd).urlAfterRedirects));
    if (this.browser) {
      try { this.conversationId = sessionStorage.getItem(STORAGE_KEY); } catch { this.conversationId = null; }
    }
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open() && this.lines().length === 0) {
      void this.send('', null, 'text');
    }
  }

  restart(): void {
    this.conversationId = null;
    this.remember(null);
    this.lines.set([]);
    this.quickReplies.set([]);
    void this.send('', null, 'text');
  }

  /** Sur téléphone, la fenêtre occupe l'écran : on la referme pour laisser voir la page ouverte. */
  onNavigate(): void {
    if (this.browser && window.innerWidth <= 480) {
      this.open.set(false);
    }
  }

  sendTyped(input: HTMLInputElement): void {
    const text = input.value.trim();
    if (!text) {
      return;
    }
    input.value = '';
    void this.send(text, text, 'text');
  }

  async send(value: string, shown: string | null, mode: 'text' | 'button'): Promise<void> {
    if (this.sending()) {
      return;
    }
    if (shown) {
      this.push([{ from: 'me', text: shown }]);
    }
    this.quickReplies.set([]);
    this.sending.set(true);
    try {
      // Bouton « Partager ma position » : le navigateur demande l'autorisation ; sans réponse, l'assistant redemande le lieu.
      const position = value === POSITION_VALUE ? await this.currentPosition() : null;
      const res = await firstValueFrom(this.http.post<AssistantResponse>(`${environment.apiUrl}/v2/assistant/messages`, {
        conversation_id: this.conversationId,
        text: value,
        input_mode: mode,
        ...(position ?? {}),
      }));
      this.conversationId = res.conversation.id;
      this.remember(res.conversation.id);
      const msgs = res.reply.messages;
      this.push(msgs.map((m, i) => ({
        from: 'bot' as const,
        text: m.text,
        ai: m.key === 'faq_ai_notice',
        card: i === msgs.length - 1 ? res.reply.card : null,
      })));
      this.quickReplies.set(res.reply.quick_replies ?? []);
    } catch (e: any) {
      if (e?.status === 404 && this.conversationId) {
        // Conversation expirée ou d'un autre compte : on repart de zéro.
        this.conversationId = null;
        this.remember(null);
      }
      this.push([{ from: 'bot', text: e?.status === 429
        ? 'Vous envoyez beaucoup de messages. Patientez une minute, puis réessayez.'
        : 'L’assistant ne répond pas pour le moment. Réessayez dans un instant, ou consultez la page « À propos ».' }]);
    } finally {
      this.sending.set(false);
    }
  }

  /** Position du téléphone ou de l'ordinateur (arrondie à ~100 m), ou null si refusée ou indisponible. */
  private currentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    if (!this.browser || !('geolocation' in navigator)) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ latitude: Math.round(p.coords.latitude * 1000) / 1000, longitude: Math.round(p.coords.longitude * 1000) / 1000 }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    });
  }

  private push(lines: ChatLine[]): void {
    this.lines.update((all) => [...all, ...lines]);
    setTimeout(() => {
      const el = this.body()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  private remember(id: string | null): void {
    try {
      id ? sessionStorage.setItem(STORAGE_KEY, id) : sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible (navigation privée) : la conversation dure le temps de la page */
    }
  }
}
