import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CounterApi } from '../../../core/api/counter.api';
import { CitizenApi } from '../../../core/api/citizen.api';
import { DocTypeRef, Territory } from '../../../core/api/citizen.types';
import { OcrScan } from '../../../core/api/api.types';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { PhotoScanComponent, PhotoScanResult } from '../../../shared/photo-scan/photo-scan.component';
import { fieldError, personNameValidator, senegalPhoneValidator } from '../../../shared/forms/validators';

/**
 * Dépôt au guichet d'un document trouvé : photo lue automatiquement, informations vérifiées,
 * trouveur (facultatif, pour le remercier par SMS). Le document passe aussitôt sous la garde de la structure
 * et le moteur de correspondance cherche son propriétaire.
 */
@Component({
  selector: 'app-staff-document-deposit',
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, PhotoScanComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Dépôt d'un document trouvé" subtitle="Le document passe sous la garde de votre structure">
      <a routerLink="/espace/documents" class="btn btn-outline-secondary">Annuler</a>
    </app-page-header>

    <form class="dt-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <section class="dt-card">
        <p class="dt-step"><span>1</span> Photo de la pièce</p>
        <app-photo-scan [scanner]="scanner" (result)="onScan($event)" (cleared)="onClear()" />
      </section>

      <section class="dt-card">
        <p class="dt-step"><span>2</span> Informations inscrites sur la pièce</p>
        <div class="row g-2">
          <div class="col-md-4">
            <label for="type" class="dt-required">Type</label>
            <select id="type" class="form-select" formControlName="document_type_id">
              <option value="" disabled>Choisir…</option>
              @for (t of types(); track t.id) { <option [value]="t.id">{{ t.TypeName }}</option> }
            </select>
            @if (fieldError(form.controls.document_type_id, 'Le type'); as e) { <small class="dt-error">{{ e }}</small> }
          </div>
          <div class="col-md-4">
            <label for="last" class="dt-required">Nom</label><input id="last" class="form-control" formControlName="last_name" />
            @if (fieldError(form.controls.last_name, 'Le nom'); as e) { <small class="dt-error">{{ e }}</small> }
          </div>
          <div class="col-md-4">
            <label for="first" class="dt-required">Prénom(s)</label><input id="first" class="form-control" formControlName="first_name" />
            @if (fieldError(form.controls.first_name, 'Le prénom'); as e) { <small class="dt-error">{{ e }}</small> }
          </div>
          <div class="col-md-4"><label for="birth">Date de naissance</label><input id="birth" class="form-control" type="date" formControlName="birth_date" /></div>
          <div class="col-md-8"><label for="num">Numéro</label><input id="num" class="form-control dt-mono" formControlName="doc_number" autocomplete="off" /></div>
        </div>
      </section>

      <section class="dt-card">
        <p class="dt-step"><span>3</span> Où et quand a-t-il été trouvé ?</p>
        <div class="row g-2">
          <div class="col-md-3"><label for="fat">Date</label><input id="fat" class="form-control" type="date" formControlName="found_at" [max]="today" /></div>
          <div class="col-md-5"><label for="fpl">Lieu</label><input id="fpl" class="form-control" formControlName="found_place" /></div>
          <div class="col-md-4">
            <label for="fdep">Département</label>
            <select id="fdep" class="form-select" formControlName="territory_code">
              <option value="">—</option>
              @for (d of departments(); track d.code) { <option [value]="d.code">{{ d.name }}</option> }
            </select>
          </div>
        </div>
      </section>

      <section class="dt-card" formGroupName="finder">
        <p class="dt-step"><span>4</span> Trouveur <small class="dt-muted fw-normal">(facultatif — il recevra un SMS de remerciement)</small></p>
        <div class="row g-2">
          <div class="col-md-4"><label for="fl">Nom</label><input id="fl" class="form-control" formControlName="last_name" /></div>
          <div class="col-md-4"><label for="ff">Prénom</label><input id="ff" class="form-control" formControlName="first_name" /></div>
          <div class="col-md-4">
            <label for="fp">Téléphone</label><input id="fp" class="form-control" type="tel" formControlName="phone" />
            @if (fieldError(form.controls.finder.controls.phone, 'Le numéro'); as e) { <small class="dt-error">{{ e }}</small> }
          </div>
        </div>
      </section>

      <div class="d-flex justify-content-end">
        <button type="submit" class="btn btn-dt btn-lg" [disabled]="saving()">
          <i class="fas fa-archive me-1" aria-hidden="true"></i> {{ saving() ? 'Enregistrement…' : 'Enregistrer le dépôt' }}
        </button>
      </div>
    </form>
  `,
})
export class StaffDocumentDepositComponent implements OnInit {
  private readonly api = inject(CounterApi);
  private readonly refs = inject(CitizenApi);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly types = signal<DocTypeRef[]>([]);
  readonly departments = signal<Territory[]>([]);
  readonly saving = signal(false);
  readonly fieldError = fieldError;
  readonly today = new Date().toISOString().slice(0, 10);
  readonly scanner = (photo: Blob) => this.api.scan(photo, 'found_document');

  private photo: Blob | null = null;
  private scan: OcrScan | null = null;

  readonly form = this.fb.nonNullable.group({
    document_type_id: ['', Validators.required],
    last_name: ['', [Validators.required, personNameValidator]],
    first_name: ['', [Validators.required, personNameValidator]],
    birth_date: [''],
    doc_number: ['', Validators.maxLength(50)],
    found_at: [new Date().toISOString().slice(0, 10)],
    found_place: ['', Validators.maxLength(255)],
    territory_code: [''],
    finder: this.fb.nonNullable.group({
      last_name: [''],
      first_name: [''],
      phone: ['', senegalPhoneValidator],
    }),
  });

  ngOnInit(): void {
    this.refs.documentTypes().subscribe({ next: (t) => this.types.set(t), error: () => this.types.set([]) });
    this.refs.departments().subscribe({ next: (d) => this.departments.set(d), error: () => this.departments.set([]) });
  }

  onScan(r: PhotoScanResult): void {
    this.photo = r.photo;
    this.scan = r.scan;
    const p = r.scan?.prefill;
    const f = r.scan?.fields;
    if (p) {
      this.form.patchValue({
        document_type_id: p.document_type_id ? String(p.document_type_id) : this.form.controls.document_type_id.value,
        last_name: p.OwnerLastName ?? this.form.controls.last_name.value,
        first_name: p.OwnerFirstName ?? this.form.controls.first_name.value,
        doc_number: p.DocIdentification ?? this.form.controls.doc_number.value,
        birth_date: toIsoDate(f?.birth_date?.value) ?? this.form.controls.birth_date.value,
      });
    }
  }

  onClear(): void {
    this.photo = null;
    this.scan = null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const finderGiven = v.finder.first_name.trim() || v.finder.last_name.trim() || v.finder.phone.trim();
    if (finderGiven && !(v.finder.first_name.trim() && v.finder.last_name.trim() && v.finder.phone.trim())) {
      void this.notify.error('Pour le trouveur, indiquez nom, prénom et téléphone (ou laissez les trois vides).');
      return;
    }
    const form = new FormData();
    form.append('document_type_id', v.document_type_id);
    form.append('last_name', v.last_name.trim());
    form.append('first_name', v.first_name.trim());
    if (v.birth_date) form.append('birth_date', v.birth_date);
    if (v.doc_number.trim()) form.append('doc_number', v.doc_number.trim());
    if (v.found_at) form.append('found_at', v.found_at);
    if (v.found_place.trim()) form.append('found_place', v.found_place.trim());
    if (v.territory_code) form.append('territory_code', v.territory_code);
    if (this.scan?.scan_id && this.scan.usable !== false) {
      form.append('ocr_scan_id', this.scan.scan_id);
    } else if (this.photo) {
      form.append('image', this.photo, 'document.jpg');
    }
    if (finderGiven) {
      form.append('finder[first_name]', v.finder.first_name.trim());
      form.append('finder[last_name]', v.finder.last_name.trim());
      form.append('finder[phone]', v.finder.phone.trim());
    }

    this.saving.set(true);
    this.api.deposit(form).subscribe({
      next: (doc) => {
        this.saving.set(false);
        this.notify.success(`Dépôt ${doc.reference} enregistré.`);
        this.router.navigate(['/espace/documents', doc.uuid]);
      },
      error: (e: HttpErrorResponse) => {
        this.saving.set(false);
        void this.notify.error(e, 'Dépôt impossible');
      },
    });
  }
}

/** « 12/05/1985 » ou « 1985-05-12 » → « 1985-05-12 » (champ date). */
export function toIsoDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const m = /^(\d{2})[/.-](\d{2})[/.-](\d{4})$/.exec(value.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
