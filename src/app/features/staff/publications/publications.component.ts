import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicationsService } from '../../../components/services/publications.service';
import { Document } from '../../../components/document-list/document-list.component';
import { SessionStore } from '../../../core/session/session.store';
import { PublisherPipe } from '../../../shared/pipes/publisher.pipe';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';

type Publication = Document & { reference?: string | null; found_channel?: string | null };

const PAGE_SIZE = 12;

/**
 * Toutes les publications en ligne (citoyens et structures), consultables depuis l'espace structure
 * sans repasser par le site public. Même vue que le public : images floutées, numéros masqués.
 */
@Component({
  selector: 'app-staff-publications',
  imports: [DatePipe, FormsModule, PublisherPipe, PageHeaderComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .pub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 1rem; }
    .pub-card { background: #fff; border: 1px solid #ebe9f5; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column;
      cursor: pointer; transition: box-shadow .15s, transform .15s; text-align: left; padding: 0; width: 100%; }
    .pub-card:hover, .pub-card:focus-visible { box-shadow: 0 8px 22px rgba(49, 40, 124, .12); transform: translateY(-2px); }
    .pub-img { position: relative; height: 150px; background: #f4f3fb; display: flex; align-items: center; justify-content: center; color: #9a97b5; }
    .pub-img img { width: 100%; height: 100%; object-fit: cover; }
    .pub-chip { position: absolute; left: .6rem; bottom: .6rem; background: #31287C; color: #fff; font-size: .7rem; font-weight: 700;
      border-radius: 999px; padding: .2rem .6rem; max-width: calc(100% - 1.2rem); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pub-status { position: absolute; right: .6rem; top: .6rem; font-size: .7rem; font-weight: 700; border-radius: 999px; padding: .2rem .6rem; }
    .pub-status.ok { background: #e3f5e8; color: #1e7b3a; }
    .pub-status.wait { background: #fff3dc; color: #a46a00; }
    .pub-body { padding: .8rem .9rem 1rem; display: flex; flex-direction: column; gap: .25rem; }
    .pub-name { font-weight: 700; color: #1f1b4d; }
    .pub-meta { font-size: .8rem; color: #6b6889; }
    .pub-mine { font-size: .7rem; font-weight: 700; color: #a46a00; }
    .pub-dialog { position: fixed; inset: 0; background: rgba(20, 16, 60, .45); z-index: 1050; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .pub-dialog__box { background: #fff; border-radius: 16px; width: min(46rem, 100%); max-height: 92vh; overflow: auto; }
    .pub-dialog__img { background: #f4f3fb; max-height: 340px; display: flex; justify-content: center; }
    .pub-dialog__img img { max-width: 100%; max-height: 340px; object-fit: contain; }
    .pub-dl { display: grid; grid-template-columns: max-content 1fr; gap: .35rem 1rem; margin: 0; }
    .pub-dl dt { color: #6b6889; font-weight: 600; font-size: .85rem; }
    .pub-dl dd { margin: 0; }
  `,
  template: `
    <app-page-header title="Publications en ligne" subtitle="Tous les documents trouvés publiés sur DocTrack (vue publique)" icon="fa-globe-africa">
      <button type="button" class="btn btn-outline-secondary" (click)="load()" [disabled]="loading()">
        <i class="fas fa-sync-alt me-1" aria-hidden="true"></i> Actualiser
      </button>
    </app-page-header>

    <form class="dt-card dt-form d-flex flex-wrap gap-2 align-items-end mb-3" (ngSubmit)="page.set(1)">
      <div class="flex-grow-1">
        <label for="p-q">Nom, prénom ou lieu</label>
        <input id="p-q" name="q" class="form-control" [ngModel]="query()" (ngModelChange)="query.set($event); page.set(1)" placeholder="Ex. Ndiaye, Sandaga…" />
      </div>
      <div>
        <label for="p-type">Pièce</label>
        <select id="p-type" name="type" class="form-select" [ngModel]="type()" (ngModelChange)="type.set($event); page.set(1)">
          <option value="">Toutes</option>
          @for (t of types(); track t) { <option [value]="t">{{ t }}</option> }
        </select>
      </div>
      <div>
        <label for="p-origin">Publiée par</label>
        <select id="p-origin" name="origin" class="form-select" [ngModel]="origin()" (ngModelChange)="origin.set($event); page.set(1)">
          <option value="">Tous</option>
          <option value="citizen">Un citoyen</option>
          <option value="counter">Une structure</option>
          <option value="mine">Ma structure</option>
        </select>
      </div>
      <div>
        <label for="p-status">Statut</label>
        <select id="p-status" name="status" class="form-select" [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)">
          <option value="">Tous</option>
          <option value="non récupéré">Non récupéré</option>
          <option value="récupéré">Récupéré</option>
        </select>
      </div>
    </form>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">Réessayer</button></app-error-state>
    } @else if (!filtered().length) {
      <div class="dt-card"><app-empty-state icon="fa-globe-africa" title="Aucune publication" text="Aucun document ne correspond à ces filtres." /></div>
    } @else {
      <p class="small text-muted mb-2"><strong>{{ filtered().length }}</strong> publication(s)</p>
      <div class="pub-grid">
        @for (doc of visible(); track doc.uuid) {
          <button type="button" class="pub-card" (click)="open(doc)">
            <div class="pub-img">
              @if (imageOf(doc); as src) {
                <img [src]="src" alt="" loading="lazy" (error)="broken.add(doc.uuid)" oncontextmenu="return false;" />
              } @else {
                <span><i class="fas fa-image me-1" aria-hidden="true"></i> Image non disponible</span>
              }
              <span class="pub-status" [class.ok]="doc.statut === 'récupéré'" [class.wait]="doc.statut !== 'récupéré'">
                {{ doc.statut === 'récupéré' ? 'Récupéré' : 'Non récupéré' }}
              </span>
              <span class="pub-chip">{{ doc.document_type?.TypeName || 'Document' }}</span>
            </div>
            <div class="pub-body">
              <span class="pub-name">{{ doc.OwnerFirstName }} {{ doc.OwnerLastName }}</span>
              <span class="pub-meta"><i class="fas fa-map-marker-alt me-1" aria-hidden="true"></i>{{ doc.Location || '—' }}</span>
              <span class="pub-meta"><i class="fas fa-user-circle me-1" aria-hidden="true"></i>{{ doc | publisher }} · {{ doc.created_at | date: 'dd/MM/yyyy' }}</span>
              @if (isMine(doc)) { <span class="pub-mine"><i class="fas fa-building me-1" aria-hidden="true"></i>Conservé par votre structure</span> }
            </div>
          </button>
        }
      </div>

      @if (pages() > 1) {
        <nav class="d-flex justify-content-center align-items-center gap-2 mt-3" aria-label="Pagination">
          <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="page() === 1" (click)="page.set(page() - 1)">
            <i class="fas fa-chevron-left" aria-hidden="true"></i> Précédent
          </button>
          <span class="small">Page <strong>{{ page() }}</strong> sur <strong>{{ pages() }}</strong></span>
          <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="page() === pages()" (click)="page.set(page() + 1)">
            Suivant <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </nav>
      }
    }

    @if (selected(); as doc) {
      <div class="pub-dialog" (click)="selected.set(null)" (keydown.escape)="selected.set(null)" role="presentation">
        <div class="pub-dialog__box" role="dialog" aria-modal="true" aria-labelledby="pub-title" (click)="$event.stopPropagation()">
          <div class="pub-dialog__img">
            @if (imageOf(doc); as src) { <img [src]="src" alt="Photo floutée du document" oncontextmenu="return false;" /> }
            @else { <p class="text-muted my-5"><i class="fas fa-image me-1" aria-hidden="true"></i> Image non disponible</p> }
          </div>
          <div class="p-3 p-md-4">
            <h2 id="pub-title" class="h5 mb-3">{{ doc.document_type?.TypeName || 'Document' }} — {{ doc.OwnerFirstName }} {{ doc.OwnerLastName }}</h2>
            <dl class="pub-dl">
              <dt>Statut</dt><dd>{{ doc.statut === 'récupéré' ? 'Récupéré par son propriétaire' : 'En attente de récupération' }}</dd>
              <dt>Lieu</dt><dd>{{ doc.Location || '—' }}</dd>
              <dt>Publié par</dt><dd>{{ doc | publisher }}</dd>
              <dt>Publié le</dt><dd>{{ doc.created_at | date: 'dd/MM/yyyy à HH:mm' }}</dd>
              @if (doc.custody) {
                <dt>Conservé par</dt>
                <dd>{{ doc.custody.name }}@if (doc.custody.phone) { · {{ doc.custody.phone }} }</dd>
              }
              @if (doc.reference) { <dt>Référence</dt><dd class="dt-mono">{{ doc.reference }}</dd> }
            </dl>
            <div class="d-flex flex-wrap justify-content-end gap-2 mt-4">
              <a class="btn btn-outline-secondary" [href]="'/document/' + doc.uuid" target="_blank" rel="noopener">
                <i class="fas fa-external-link-alt me-1" aria-hidden="true"></i> Fiche publique
              </a>
              <button type="button" class="btn btn-dt" (click)="selected.set(null)">Fermer</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class StaffPublicationsComponent implements OnInit {
  private readonly publications = inject(PublicationsService);
  private readonly session = inject(SessionStore);

  readonly all = signal<Publication[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly type = signal('');
  readonly origin = signal('');
  readonly status = signal('');
  readonly page = signal(1);
  readonly selected = signal<Publication | null>(null);
  /** Images qui n'ont pas pu se charger. */
  readonly broken = new Set<string>();

  readonly types = computed(() =>
    [...new Set(this.all().map((d) => d.document_type?.TypeName).filter((t): t is string => !!t))].sort((a, b) => a.localeCompare(b, 'fr')),
  );

  readonly filtered = computed(() => {
    const q = normalize(this.query());
    return this.all().filter((d) =>
      (!q || normalize(`${d.OwnerFirstName} ${d.OwnerLastName} ${d.Location ?? ''}`).includes(q))
      && (!this.type() || d.document_type?.TypeName === this.type())
      && (!this.status() || (this.status() === 'récupéré') === (d.statut === 'récupéré'))
      && (!this.origin()
        || (this.origin() === 'mine' && this.isMine(d))
        || (this.origin() === 'counter' && this.isFromStructure(d))
        || (this.origin() === 'citizen' && !this.isFromStructure(d))),
    );
  });

  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly visible = computed(() => {
    const page = Math.min(this.page(), this.pages());
    return this.filtered().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.publications.getAllPublications().subscribe({
      next: (docs) => {
        this.all.set(docs as Publication[]);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Les publications n’ont pas pu être chargées.');
        this.loading.set(false);
      },
    });
  }

  open(doc: Publication): void {
    this.selected.set(doc);
  }

  imageOf(doc: Publication): string | null {
    return this.broken.has(doc.uuid) ? null : (doc.image_blurred || doc.image || null);
  }

  isFromStructure(doc: Publication): boolean {
    return doc.found_channel === 'counter' || (!doc.user && !!doc.custody);
  }

  /** Document conservé par la structure active de l'agent. */
  isMine(doc: Publication): boolean {
    const uuid = this.session.activeOrganization()?.uuid;
    return !!uuid && doc.custody?.uuid === uuid;
  }
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
