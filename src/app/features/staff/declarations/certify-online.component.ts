import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CounterApi } from '../../../core/api/counter.api';
import { CertifyOnlinePayload, CounterDeclaration, ID_TYPE_LABELS, IdType, OnlineDeclarationLookup } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { openBlob } from '../../../shared/media/open-blob';
import { fieldError } from '../../../shared/forms/validators';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';

/**
 * Certifier au guichet une déclaration faite en ligne par le citoyen.
 *
 *  1. Le citoyen donne sa référence (DT-…) ou le QR code de son récépissé (lien ou code) :
 *     l'agent ne voit qu'un résumé minimal (type de pièce, initiales).
 *  2. L'agent vérifie l'identité de la personne présente (pièce, photo, nom).
 *  3. Il complète si besoin le lieu, la date, les circonstances.
 *  4. Certification : la déclaration est rattachée à la structure et le certificat de perte est délivré.
 *
 * Toute structure habilitée peut certifier, quel que soit le lieu de la perte.
 */
@Component({
  selector: 'app-staff-certify-online',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, PageHeaderComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Certifier une déclaration en ligne"
      subtitle="Le citoyen a déclaré sa perte sur DocTrack : vérifiez son identité et délivrez le certificat de perte">
      <a routerLink="/espace/declarations" class="btn btn-outline-secondary">Déclarations</a>
    </app-page-header>

    @if (result(); as d) {
      <!-- ── Certificat délivré ── -->
      <section class="dt-card text-center py-4">
        <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--dt-success)" aria-hidden="true"></i>
        <h2 class="h4 mt-2">Déclaration certifiée</h2>
        <p class="mb-1">Dossier <span class="dt-mono">{{ d.reference }}</span> rattaché à {{ d.organization?.name }}.</p>
        @if (d.certificate; as c) {
          <p class="mb-1">Certificat de perte N° <span class="dt-mono">{{ c.number }}</span></p>
          <p class="small dt-muted">Code de vérification : <span class="dt-mono">{{ c.verification_code }}</span></p>
        } @else {
          <p class="small dt-muted">Le certificat sera délivré dès que le frais sera réglé (voir la fiche).</p>
        }
        <div class="d-flex flex-wrap justify-content-center gap-2 mt-3">
          @if (d.certificate?.kind === 'official') {
            <button type="button" class="btn btn-dt" [disabled]="opening()" (click)="openCertificate(d)">
              <i class="fas fa-print me-1" aria-hidden="true"></i> {{ opening() ? 'Ouverture…' : 'Imprimer le certificat' }}
            </button>
          }
          <a [routerLink]="['/espace/declarations', d.uuid]" class="btn btn-outline-secondary">Voir la fiche</a>
          <button type="button" class="btn btn-link" (click)="reset()">Certifier une autre déclaration</button>
        </div>
      </section>
    } @else {
      <!-- ── Étape 1 : retrouver la déclaration ── -->
      <section class="dt-card">
        <p class="dt-step"><span>1</span> Retrouver la déclaration</p>
        <form class="dt-form d-flex flex-wrap gap-2 align-items-end" [formGroup]="search" (ngSubmit)="lookup()">
          <div class="flex-grow-1" style="min-width: 16rem">
            <label for="q">Référence, code ou lien du QR code du récépissé</label>
            <input id="q" class="form-control dt-mono" formControlName="q" placeholder="DT-2026-000123" autocomplete="off" />
          </div>
          <button type="submit" class="btn btn-dt" [disabled]="searching()">
            <i class="fas fa-search me-1" aria-hidden="true"></i> {{ searching() ? 'Recherche…' : 'Rechercher' }}
          </button>
        </form>
        <small class="form-text d-block mt-2">Scannez le QR code du récépissé avec un lecteur de QR : collez ici le lien obtenu, ou saisissez la référence.</small>
        @if (searchError()) {
          <div class="dt-callout dt-callout--warning mt-3 mb-0"><i class="fas fa-info-circle" aria-hidden="true"></i><div>{{ searchError() }}</div></div>
        }
      </section>

      @if (found(); as f) {
        <section class="dt-card">
          <div class="dt-card__head">
            <h2 class="dt-card__title">Déclaration <span class="dt-mono">{{ f.reference }}</span></h2>
            <app-status-badge [status]="f.status" />
          </div>
          <p class="mb-1">{{ f.document_types.join(', ') || 'Document' }} — titulaire <b>{{ f.holder_initials }}</b></p>
          <p class="dt-card__meta mb-0">
            Déclarée en ligne le {{ f.declared_at | date: 'd MMMM y' }}
            @if (f.lost_place || f.lost_at) { · perte {{ f.lost_at ? (f.lost_at | date: 'd MMM y') : '' }} {{ f.lost_place }} }
          </p>
          @if (f.certified; as c) {
            <div class="dt-callout dt-callout--info mt-3 mb-0"><i class="fas fa-check-double" aria-hidden="true"></i>
              <div>Déjà certifiée le {{ c.date | date: 'd MMMM y' }} par {{ c.structure }}. Le certificat ne peut pas être délivré deux fois.</div>
            </div>
          } @else if (!f.can_certify) {
            <div class="dt-callout dt-callout--warning mt-3 mb-0"><i class="fas fa-ban" aria-hidden="true"></i>
              <div>Cette déclaration ne peut plus être certifiée (statut : {{ f.status }}).</div>
            </div>
          }
        </section>

        @if (f.can_certify) {
          <form class="dt-form" [formGroup]="form" (ngSubmit)="certify(f)" novalidate>
            <!-- ── Étape 2 : identité ── -->
            <section class="dt-card">
              <p class="dt-step"><span>2</span> Identité de la personne présente</p>
              <p class="small dt-muted">Le titulaire du document se présente en personne. Saisissez le nom tel qu'il figure sur la pièce présentée.</p>
              <div class="row g-3" formGroupName="person">
                <div class="col-md-4">
                  <label for="p-first" class="dt-required">Prénom(s)</label>
                  <input id="p-first" class="form-control" formControlName="first_name" autocomplete="off" />
                  @if (fieldError(form.controls.person.controls.first_name, 'Le prénom'); as err) { <small class="dt-error">{{ err }}</small> }
                </div>
                <div class="col-md-4">
                  <label for="p-last" class="dt-required">Nom</label>
                  <input id="p-last" class="form-control" formControlName="last_name" autocomplete="off" />
                  @if (fieldError(form.controls.person.controls.last_name, 'Le nom'); as err) { <small class="dt-error">{{ err }}</small> }
                </div>
                <div class="col-md-4">
                  <label for="p-birth">Date de naissance</label>
                  <input id="p-birth" type="date" class="form-control" formControlName="birth_date" [max]="today" />
                </div>
                <div class="col-md-5">
                  <label for="p-idtype">Pièce présentée <span class="dt-muted small">(facultatif)</span></label>
                  <select id="p-idtype" class="form-select" formControlName="id_type">
                    <option value="">Aucune pièce : la personne a tout perdu</option>
                    @for (t of idTypes; track t[0]) { <option [value]="t[0]">{{ t[1] }}</option> }
                  </select>
                </div>
                @if (hasIdDocument()) {
                  <div class="col-md-7">
                    <label for="p-idnum" class="dt-required">Numéro de la pièce présentée</label>
                    <input id="p-idnum" class="form-control dt-mono" formControlName="id_number" autocomplete="off" />
                    <small class="form-text">Conservé seulement sous forme masquée (4 derniers caractères).</small>
                    @if (idError(); as err) { <small class="dt-error d-block">{{ err }}</small> }
                  </div>
                }
              </div>
              @if (hasIdDocument()) {
                <div class="form-check mt-3">
                  <input class="form-check-input" type="checkbox" id="chk-photo" formControlName="identity_photo_matches" />
                  <label class="form-check-label" for="chk-photo">J'ai vérifié que la photo de la pièce présentée correspond à la personne présente.</label>
                </div>
              } @else {
                <div class="dt-callout dt-callout--warning mt-3">
                  <i class="fas fa-info-circle" aria-hidden="true"></i>
                  <div>Sans pièce d'identité, notez dans <b>Circonstances</b> (étape 3) comment l'identité a été vérifiée :
                    témoin, extrait de naissance, carte professionnelle…</div>
                </div>
              }
              @if (needOverride()) {
                <div class="dt-callout dt-callout--warning mt-3">
                  <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                  <div>
                    {{ needOverride() }}
                    <label for="override" class="d-block mt-2">Motif de la dérogation (responsable de la structure)</label>
                    <input id="override" class="form-control" formControlName="name_override_reason" placeholder="Ex. nom d'épouse vérifié sur l'acte de mariage" />
                  </div>
                </div>
              }
            </section>

            <!-- ── Étape 3 : compléments ── -->
            <section class="dt-card">
              <p class="dt-step"><span>3</span> Compléments pour le certificat <span class="dt-muted small fw-normal">(facultatif)</span></p>
              <div class="row g-3">
                <div class="col-md-4">
                  <label for="c-date">Date de la perte</label>
                  <input id="c-date" type="date" class="form-control" formControlName="lost_at" [max]="today" />
                </div>
                <div class="col-md-8">
                  <label for="c-place">Lieu de la perte</label>
                  <input id="c-place" class="form-control" formControlName="lost_place" />
                </div>
                @if (!f.has_doc_number) {
                  <div class="col-md-6">
                    <label for="c-num">Numéro du document perdu</label>
                    <input id="c-num" class="form-control dt-mono" formControlName="doc_number" autocomplete="off" />
                  </div>
                }
                <div class="col-12">
                  <label for="c-circ" [class.dt-required]="!hasIdDocument()">Circonstances</label>
                  <textarea id="c-circ" class="form-control" rows="2" formControlName="circumstances"
                    [placeholder]="hasIdDocument() ? '' : 'Ex. toutes ses pièces perdues ; identité confirmée par un témoin (nom, pièce du témoin)'"></textarea>
                  @if (circumstancesError(); as err) { <small class="dt-error d-block">{{ err }}</small> }
                </div>
              </div>
            </section>

            <div class="d-flex justify-content-end gap-2 mt-3">
              <button type="submit" class="btn btn-dt btn-lg" [disabled]="saving()">
                <i class="fas fa-certificate me-1" aria-hidden="true"></i>
                {{ saving() ? 'Certification…' : 'Certifier et délivrer le certificat' }}
              </button>
            </div>
          </form>
        }
      }
    }
  `,
})
export class StaffCertifyOnlineComponent {
  private readonly api = inject(CounterApi);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly idTypes = Object.entries(ID_TYPE_LABELS) as [IdType, string][];
  readonly fieldError = fieldError;
  readonly today = new Date().toISOString().slice(0, 10);

  readonly searching = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly found = signal<OnlineDeclarationLookup | null>(null);
  readonly saving = signal(false);
  readonly opening = signal(false);
  readonly needOverride = signal<string | null>(null);
  readonly result = signal<CounterDeclaration | null>(null);
  /** Erreurs affichées après une tentative de certification. */
  readonly idError = signal<string | null>(null);
  readonly circumstancesError = signal<string | null>(null);

  readonly search = this.fb.nonNullable.group({
    q: ['', [Validators.required, Validators.minLength(4)]],
  });

  readonly form = this.fb.nonNullable.group({
    person: this.fb.nonNullable.group({
      first_name: ['', [Validators.required, Validators.maxLength(100)]],
      last_name: ['', [Validators.required, Validators.maxLength(100)]],
      birth_date: [''],
      id_type: ['cni' as IdType | ''],
      id_number: ['', [Validators.maxLength(50)]],
    }),
    identity_photo_matches: [false],
    name_override_reason: [''],
    lost_at: [''],
    lost_place: ['', Validators.maxLength(255)],
    doc_number: ['', Validators.maxLength(50)],
    circumstances: ['', Validators.maxLength(2000)],
  });

  lookup(): void {
    if (this.search.invalid) {
      this.search.markAllAsTouched();
      return;
    }
    this.searching.set(true);
    this.searchError.set(null);
    this.found.set(null);
    this.api.lookupOnlineDeclaration(this.search.getRawValue().q.trim()).subscribe({
      next: (f) => {
        this.searching.set(false);
        this.found.set(f);
        this.needOverride.set(null);
        this.form.reset();
        this.idError.set(null);
        this.circumstancesError.set(null);
        this.form.patchValue({ lost_at: f.lost_at ?? '', lost_place: f.lost_place ?? '' });
      },
      error: (e) => {
        this.searching.set(false);
        this.searchError.set(apiErrorMessage(e, 'Aucune déclaration en ligne ne correspond.'));
      },
    });
  }

  /** Une pièce d'identité est présentée (sinon : la victime a tout perdu). */
  hasIdDocument(): boolean {
    return !!this.form.controls.person.controls.id_type.value;
  }

  certify(f: OnlineDeclarationLookup): void {
    const v = this.form.getRawValue();
    const hasId = !!v.person.id_type;
    this.idError.set(hasId && v.person.id_number.trim().length < 4 ? 'Saisissez le numéro de la pièce présentée (4 caractères au moins).' : null);
    this.circumstancesError.set(!hasId && v.circumstances.trim().length < 10
      ? 'Sans pièce d’identité, indiquez comment l’identité a été vérifiée.' : null);
    if (this.form.invalid || this.idError() || this.circumstancesError()) {
      this.form.markAllAsTouched();
      return;
    }
    if (hasId && !v.identity_photo_matches) {
      void this.notify.error('Vérifiez que la photo de la pièce présentée correspond à la personne, puis cochez la case.');
      return;
    }
    const payload: CertifyOnlinePayload = {
      person: {
        first_name: v.person.first_name.trim(),
        last_name: v.person.last_name.trim(),
        birth_date: v.person.birth_date || null,
        id_type: hasId ? (v.person.id_type as IdType) : null,
        id_number: hasId ? v.person.id_number.trim() : null,
      },
      checks: { identity_photo_matches: hasId && v.identity_photo_matches },
      name_override_reason: v.name_override_reason.trim() || null,
      lost_at: v.lost_at || null,
      lost_place: v.lost_place.trim() || null,
      doc_number: v.doc_number.trim() || null,
      circumstances: v.circumstances.trim() || null,
    };

    this.saving.set(true);
    this.api.certifyOnlineDeclaration(f.uuid, payload).subscribe({
      next: (d) => {
        this.saving.set(false);
        this.result.set(d);
        this.notify.success('Déclaration certifiée : certificat de perte délivré.');
      },
      error: (e) => {
        this.saving.set(false);
        const errors = e?.error?.errors ?? {};
        if (e?.status === 422 && (errors['person.last_name'] || errors['name_override_reason'])) {
          this.needOverride.set((errors['name_override_reason'] ?? errors['person.last_name'])[0]);
          void this.notify.info('Le nom ne correspond pas à la déclaration : voir le formulaire.', 'Vérification');
          return;
        }
        void this.notify.error(e, 'Certification impossible');
      },
    });
  }

  openCertificate(d: CounterDeclaration): void {
    this.opening.set(true);
    this.api.certificatePdf(d.uuid).subscribe({
      next: (blob) => {
        this.opening.set(false);
        openBlob(blob, `${d.certificate?.number ?? d.reference}.pdf`);
      },
      error: (e) => {
        this.opening.set(false);
        void this.notify.error(e, 'Certificat indisponible');
      },
    });
  }

  reset(): void {
    this.result.set(null);
    this.found.set(null);
    this.searchError.set(null);
    this.needOverride.set(null);
    this.search.reset();
    this.form.reset();
    this.idError.set(null);
    this.circumstancesError.set(null);
  }
}
