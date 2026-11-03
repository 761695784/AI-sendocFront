import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { CounterApi } from '../../../core/api/counter.api';
import { CitizenProfile } from '../../../core/api/counter.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { fieldError, personNameValidator, senegalPhoneValidator } from '../../../shared/forms/validators';

/**
 * Trouver la personne au guichet (par téléphone, ou nom + prénom, date de naissance facultative)
 * parmi TOUTES les personnes connues de DocTrack (comptes inscrits compris),
 * ou l'enregistrer si elle est inconnue. Évite les doublons de fiches.
 */
@Component({
  selector: 'app-citizen-picker',
  imports: [ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="btn-group mb-3" role="group" aria-label="Mode de recherche">
      <button type="button" class="btn btn-sm" [class.btn-dt]="mode() === 'phone'" [class.btn-outline-secondary]="mode() !== 'phone'" (click)="mode.set('phone')">Par téléphone</button>
      <button type="button" class="btn btn-sm" [class.btn-dt]="mode() === 'identity'" [class.btn-outline-secondary]="mode() !== 'identity'" (click)="mode.set('identity')">Par identité</button>
    </div>

    <form class="dt-form row g-2 align-items-end" [formGroup]="search" (ngSubmit)="find()">
      @if (mode() === 'phone') {
        <div class="col-sm-8">
          <label for="cp-phone">Téléphone</label>
          <input id="cp-phone" class="form-control" type="tel" inputmode="tel" formControlName="phone" placeholder="77 123 45 67" />
        </div>
      } @else {
        <div class="col-sm-3"><label for="cp-last">Nom</label><input id="cp-last" class="form-control" formControlName="last_name" /></div>
        <div class="col-sm-3"><label for="cp-first">Prénom</label><input id="cp-first" class="form-control" formControlName="first_name" /></div>
        <div class="col-sm-3"><label for="cp-birth">Date de naissance <span class="dt-muted fw-normal">(facultatif)</span></label><input id="cp-birth" class="form-control" type="date" formControlName="birth_date" /></div>
      }
      <div class="col-auto">
        <button type="submit" class="btn btn-dt" [disabled]="searching()">{{ searching() ? 'Recherche…' : 'Rechercher' }}</button>
      </div>
    </form>
    @if (searchError()) { <small class="dt-error">{{ searchError() }}</small> }

    @if (results(); as list) {
      <div class="mt-3">
        @if (list.length) {
          <div class="list-group">
            @for (c of list; track c.uuid) {
              <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" (click)="picked.emit(c)">
                <span>
                  <b>{{ c.first_name }} {{ c.last_name }}</b>
                  <small class="d-block dt-muted">
                    @if (c.birth_date) { Né(e) le {{ c.birth_date | date: 'd MMM y' }} · }
                    {{ c.phone_masked }}{{ c.account_status === 'pending' ? ' · compte à activer' : c.has_account ? ' · compte DocTrack' : '' }}
                  </small>
                </span>
                <span class="btn btn-sm btn-outline-primary">Choisir</span>
              </button>
            }
          </div>
        } @else {
          <p class="dt-muted mb-2">Aucune personne trouvée.</p>
        }
        @if (canCreate() && !creating()) {
          <button type="button" class="btn btn-sm btn-outline-secondary mt-2" (click)="startCreate()"><i class="fas fa-user-plus me-1" aria-hidden="true"></i> Enregistrer une nouvelle personne</button>
        }
      </div>
    }

    @if (creating()) {
      <form class="dt-form border rounded-3 p-3 mt-3" [formGroup]="person" (ngSubmit)="create()">
        <h3 class="h6 mb-3">Nouvelle personne</h3>
        <div class="row g-2">
          <div class="col-sm-6"><label for="np-last" class="dt-required">Nom</label><input id="np-last" class="form-control" formControlName="last_name" />
            @if (fieldError(person.controls.last_name, 'Le nom'); as e) { <small class="dt-error">{{ e }}</small> }</div>
          <div class="col-sm-6"><label for="np-first" class="dt-required">Prénom(s)</label><input id="np-first" class="form-control" formControlName="first_name" />
            @if (fieldError(person.controls.first_name, 'Le prénom'); as e) { <small class="dt-error">{{ e }}</small> }</div>
          <div class="col-sm-4"><label for="np-birth">Date de naissance</label><input id="np-birth" class="form-control" type="date" formControlName="birth_date" /></div>
          <div class="col-sm-4"><label for="np-phone" class="dt-required">Téléphone</label><input id="np-phone" class="form-control" type="tel" formControlName="phone" />
            @if (fieldError(person.controls.phone, 'Le téléphone'); as e) { <small class="dt-error">{{ e }}</small> }</div>
          <div class="col-sm-4"><label for="np-email">E-mail (crée son compte)</label><input id="np-email" class="form-control" type="email" formControlName="email" />
            @if (fieldError(person.controls.email, 'L’email'); as e) { <small class="dt-error">{{ e }}</small> }</div>
        </div>
        <p class="small dt-muted mt-2 mb-0"><i class="fas fa-info-circle me-1" aria-hidden="true"></i>
          Avec un email, son compte DocTrack est créé : la personne reçoit un lien pour choisir son mot de passe et retrouve ses déclarations dans son espace.</p>
        @if (createError()) { <div class="alert alert-warning py-2 mt-2 mb-0">{{ createError() }}</div> }
        <div class="d-flex gap-2 mt-3">
          <button type="submit" class="btn btn-dt" [disabled]="saving()">{{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</button>
          <button type="button" class="btn btn-link" (click)="creating.set(false)">Annuler</button>
        </div>
      </form>
    }
  `,
})
export class CitizenPickerComponent {
  private readonly api = inject(CounterApi);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly picked = output<CitizenProfile>();

  readonly mode = signal<'phone' | 'identity'>('phone');
  readonly results = signal<CitizenProfile[] | null>(null);
  readonly searching = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly creating = signal(false);
  readonly saving = signal(false);
  readonly createError = signal<string | null>(null);
  readonly canCreate = () => this.session.can('citizens.create');
  readonly fieldError = fieldError;

  readonly search = this.fb.nonNullable.group({ phone: [''], last_name: [''], first_name: [''], birth_date: [''] });
  readonly person = this.fb.nonNullable.group({
    last_name: ['', [Validators.required, personNameValidator]],
    first_name: ['', [Validators.required, personNameValidator]],
    birth_date: [''],
    phone: ['', [Validators.required, senegalPhoneValidator]],
    email: ['', Validators.email],
  });

  find(): void {
    const v = this.search.getRawValue();
    const query =
      this.mode() === 'phone'
        ? { phone: v.phone.trim() }
        : { last_name: v.last_name.trim(), first_name: v.first_name.trim(), ...(v.birth_date ? { birth_date: v.birth_date } : {}) };
    if (this.mode() === 'phone' ? !query.phone : !(v.last_name.trim() && v.first_name.trim())) {
      this.searchError.set(this.mode() === 'phone' ? 'Saisissez un numéro.' : 'Le nom et le prénom sont nécessaires (la date de naissance est facultative).');
      return;
    }
    this.searchError.set(null);
    this.searching.set(true);
    this.api.searchCitizens(query).subscribe({
      next: (list) => {
        this.results.set(list);
        this.searching.set(false);
      },
      error: (e) => {
        this.searching.set(false);
        this.searchError.set(apiErrorMessage(e));
      },
    });
  }

  startCreate(): void {
    const v = this.search.getRawValue();
    this.person.patchValue({ phone: v.phone, last_name: v.last_name, first_name: v.first_name, birth_date: v.birth_date });
    this.createError.set(null);
    this.creating.set(true);
  }

  create(): void {
    if (this.person.invalid) {
      this.person.markAllAsTouched();
      return;
    }
    const v = this.person.getRawValue();
    this.saving.set(true);
    this.api
      .createCitizen({ ...v, birth_date: v.birth_date || null, email: v.email || null })
      .subscribe({
        next: (c) => {
          this.saving.set(false);
          this.creating.set(false);
          this.notify.success(`${c.first_name} ${c.last_name} est enregistré(e).`);
          this.picked.emit(c);
        },
        error: (e: HttpErrorResponse) => {
          this.saving.set(false);
          // 409 : la personne existe déjà → on la propose.
          if (e.status === 409 && e.error?.existing) {
            this.results.set([e.error.existing]);
            this.creating.set(false);
            this.searchError.set('Cette personne existe déjà : choisissez-la dans la liste.');
          } else {
            this.createError.set(apiErrorMessage(e));
          }
        },
      });
  }
}
