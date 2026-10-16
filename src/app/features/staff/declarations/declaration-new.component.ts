import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CounterApi } from '../../../core/api/counter.api';
import { CitizenApi } from '../../../core/api/citizen.api';
import { CitizenProfile } from '../../../core/api/counter.types';
import { DocTypeRef, Territory } from '../../../core/api/citizen.types';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { fieldError, personNameValidator } from '../../../shared/forms/validators';
import { CitizenAccountComponent } from '../shared/citizen-account.component';
import { CitizenPickerComponent } from '../shared/citizen-picker.component';

type ItemForm = FormGroup<{
  document_type_id: FormControl<string>;
  first_name: FormControl<string>;
  last_name: FormControl<string>;
  birth_date: FormControl<string>;
  doc_number: FormControl<string>;
}>;

/**
 * Déclaration de perte au guichet, en 3 étapes : la personne, les pièces perdues (jusqu'à 10),
 * les circonstances. Le certificat officiel est délivré à l'enregistrement (ou après paiement en mode payant).
 */
@Component({
  selector: 'app-staff-declaration-new',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, PageHeaderComponent, CitizenPickerComponent, CitizenAccountComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './declaration-new.component.html',
})
export class StaffDeclarationNewComponent implements OnInit {
  private readonly api = inject(CounterApi);
  private readonly refs = inject(CitizenApi);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly citizen = signal<CitizenProfile | null>(null);
  readonly types = signal<DocTypeRef[]>([]);
  readonly departments = signal<Territory[]>([]);
  readonly saving = signal(false);
  readonly fieldError = fieldError;
  readonly today = new Date().toISOString().slice(0, 10);

  readonly items: FormArray<ItemForm> = this.fb.array<ItemForm>([]);
  readonly context = this.fb.nonNullable.group({
    lost_at: [''],
    lost_place: ['', Validators.maxLength(255)],
    territory_code: [''],
    circumstances: ['', Validators.maxLength(2000)],
  });

  ngOnInit(): void {
    this.refs.documentTypes().subscribe({ next: (t) => this.types.set(t), error: () => this.types.set([]) });
    this.refs.departments().subscribe({ next: (d) => this.departments.set(d), error: () => this.departments.set([]) });
    // Personne choisie depuis l'écran « Citoyens ».
    const fromState = (history.state as { citizen?: CitizenProfile } | null)?.citizen;
    if (fromState?.uuid) {
      this.choose(fromState);
    }
  }

  choose(c: CitizenProfile): void {
    this.citizen.set(c);
    if (this.items.length === 0) {
      this.addItem();
    }
  }

  addItem(): void {
    const c = this.citizen();
    this.items.push(
      this.fb.nonNullable.group({
        document_type_id: ['', Validators.required],
        first_name: [c?.first_name ?? '', [Validators.required, personNameValidator]],
        last_name: [c?.last_name ?? '', [Validators.required, personNameValidator]],
        birth_date: [c?.birth_date ?? ''],
        doc_number: ['', Validators.maxLength(50)],
      }),
    );
  }

  removeItem(i: number): void {
    this.items.removeAt(i);
  }

  submit(): void {
    const c = this.citizen();
    if (!c) {
      return;
    }
    if (this.items.invalid || this.context.invalid || this.items.length === 0) {
      this.items.markAllAsTouched();
      this.context.markAllAsTouched();
      return;
    }
    const ctx = this.context.getRawValue();
    this.saving.set(true);
    this.api
      .declare({
        citizen_profile_uuid: c.uuid,
        lost_at: ctx.lost_at || null,
        lost_place: ctx.lost_place.trim() || null,
        territory_code: ctx.territory_code || null,
        circumstances: ctx.circumstances.trim() || null,
        items: this.items.getRawValue().map((i) => ({
          document_type_id: Number(i.document_type_id),
          first_name: i.first_name.trim(),
          last_name: i.last_name.trim(),
          birth_date: i.birth_date || null,
          doc_number: i.doc_number.trim() || null,
        })),
      })
      .subscribe({
        next: (d) => {
          this.saving.set(false);
          this.notify.success(`Déclaration ${d.reference} enregistrée.`);
          this.router.navigate(['/espace/declarations', d.uuid]);
        },
        error: (e) => {
          this.saving.set(false);
          void this.notify.error(e, 'Enregistrement impossible');
        },
      });
  }
}
