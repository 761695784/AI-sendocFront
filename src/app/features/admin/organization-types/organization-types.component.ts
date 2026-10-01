import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../../../core/api/admin.api';
import { PilotApi } from '../../../core/api/pilot.api';
import { LEVEL_LABELS, OrgLevel, OrganizationType } from '../../../core/api/pilot.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { fieldError } from '../../../shared/forms/validators';

/** Code technique proposé à partir du nom : « Brigade de gendarmerie » → « brigade_de_gendarmerie ». */
export function slugCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

const LEVEL_HELP: Record<OrgLevel, string> = {
  institution: 'Racine de l’arbre (ex. Police nationale, Gendarmerie nationale, Ville de Dakar).',
  intermediate: 'Échelon de rattachement sans guichet (ex. direction régionale, compagnie, légion).',
  structure: 'Lieu d’accueil du public : déclarations, dépôts, restitutions (ex. commissariat, brigade, mairie).',
};

/**
 * Types de structure (super admin) : le vocabulaire de l'arbre des organisations.
 * Le niveau d'un type déjà utilisé ne change plus, et un type utilisé ne se supprime pas (règles de l'API).
 */
@Component({
  selector: 'app-admin-organization-types',
  imports: [ReactiveFormsModule, PageHeaderComponent, LoadingComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Types de structure" subtitle="Le vocabulaire de l'arbre : institutions, échelons intermédiaires et structures d'accueil" />

    <section class="dt-card">
      <h2 class="dt-card__title mb-2">Nouveau type</h2>
      <form class="dt-form" [formGroup]="form" (ngSubmit)="create()" novalidate>
        <div class="row g-2 align-items-end">
          <div class="col-md-4"><label for="t-name" class="dt-required">Nom</label>
            <input id="t-name" class="form-control" formControlName="name" placeholder="Ex. Brigade de gendarmerie" (input)="suggestCode()" />
            @if (fieldError(form.controls.name, 'Le nom'); as e) { <small class="dt-error">{{ e }}</small> }</div>
          <div class="col-md-3"><label for="t-code" class="dt-required">Code</label>
            <input id="t-code" class="form-control dt-mono" formControlName="code" (input)="codeTouched = true" />
            @if (form.controls.code.touched && form.controls.code.errors?.['pattern']) { <small class="dt-error">Minuscules, chiffres et _ uniquement.</small> }
            @else if (fieldError(form.controls.code, 'Le code'); as e) { <small class="dt-error">{{ e }}</small> }</div>
          <div class="col-md-3"><label for="t-level" class="dt-required">Niveau</label>
            <select id="t-level" class="form-select" formControlName="level">
              @for (l of levels; track l) { <option [value]="l">{{ levelLabels[l] }}</option> }
            </select></div>
          <div class="col-md-2"><button type="submit" class="btn btn-dt w-100" [disabled]="saving()">{{ saving() ? 'Ajout…' : 'Ajouter' }}</button></div>
        </div>
        <small class="dt-muted d-block mt-2">{{ levelHelp[form.controls.level.value] }}</small>
      </form>
    </section>

    @if (loading()) {
      <app-loading />
    } @else if (error()) {
      <app-error-state [message]="error()!"><button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">Réessayer</button></app-error-state>
    } @else {
      @for (l of levels; track l) {
        <section class="dt-card p-0 overflow-hidden">
          <div class="p-3 pb-2">
            <h2 class="dt-card__title mb-0">{{ levelLabels[l] }} <small class="dt-muted fw-normal">({{ byLevel()[l].length }})</small></h2>
            <small class="dt-muted">{{ levelHelp[l] }}</small>
          </div>
          @if (!byLevel()[l].length) {
            <p class="px-3 pb-3 mb-0 small dt-muted">Aucun type à ce niveau.</p>
          } @else {
            <table class="table align-middle mb-0">
              <tbody>
                @for (t of byLevel()[l]; track t.code) {
                  <tr>
                    <td class="dt-mono small" style="width: 30%">{{ t.code }}</td>
                    <td>
                      @if (editing() === t.code) {
                        <form class="d-flex gap-2" (submit)="$event.preventDefault(); rename(t, nameInput.value)">
                          <input #nameInput class="form-control form-control-sm" [value]="t.name" aria-label="Nouveau nom" />
                          <button type="submit" class="btn btn-sm btn-dt">OK</button>
                          <button type="button" class="btn btn-sm btn-outline-secondary" (click)="editing.set(null)">Annuler</button>
                        </form>
                      } @else { {{ t.name }} }
                    </td>
                    <td class="text-end text-nowrap">
                      @if (editing() !== t.code) {
                        <button type="button" class="btn btn-sm btn-outline-secondary" (click)="editing.set(t.code)" [attr.aria-label]="'Renommer ' + t.name">Renommer</button>
                        <button type="button" class="btn btn-sm btn-outline-danger ms-1" (click)="remove(t)" [attr.aria-label]="'Supprimer ' + t.name">Supprimer</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }
    }
  `,
})
export class AdminOrganizationTypesComponent implements OnInit {
  private readonly admin = inject(AdminApi);
  private readonly pilot = inject(PilotApi);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly levels: OrgLevel[] = ['institution', 'intermediate', 'structure'];
  readonly levelLabels = LEVEL_LABELS;
  readonly levelHelp = LEVEL_HELP;
  readonly fieldError = fieldError;

  readonly types = signal<OrganizationType[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly editing = signal<string | null>(null);
  codeTouched = false;

  readonly byLevel = computed(() => {
    const groups: Record<string, OrganizationType[]> = { institution: [], intermediate: [], structure: [] };
    for (const t of this.types()) {
      (groups[t.level] ??= []).push(t);
    }
    return groups;
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[a-z0-9_]+$/)]],
    level: ['structure' as OrgLevel, Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.pilot.organizationTypes().subscribe({
      next: (t) => {
        this.types.set(t);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  suggestCode(): void {
    if (!this.codeTouched) {
      this.form.controls.code.setValue(slugCode(this.form.controls.name.value));
    }
  }

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.admin.createOrganizationType({ code: v.code, name: v.name.trim(), level: v.level }).subscribe({
      next: (t) => {
        this.saving.set(false);
        this.types.update((list) => [...list, t].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
        this.form.reset({ name: '', code: '', level: v.level });
        this.codeTouched = false;
        this.notify.success(`Type « ${t.name} » ajouté.`);
      },
      error: (e) => {
        this.saving.set(false);
        void this.notify.error(e);
      },
    });
  }

  rename(t: OrganizationType, name: string): void {
    const clean = name.trim();
    if (!clean || clean === t.name) {
      this.editing.set(null);
      return;
    }
    this.admin.updateOrganizationType(t.code, { name: clean }).subscribe({
      next: (u) => {
        this.editing.set(null);
        this.types.update((list) => list.map((x) => (x.code === t.code ? u : x)));
        this.notify.success('Type renommé.');
      },
      error: (e) => void this.notify.error(e),
    });
  }

  async remove(t: OrganizationType): Promise<void> {
    const ok = await this.notify.confirm({ title: `Supprimer « ${t.name} » ?`, text: 'Impossible si des organisations utilisent ce type.', confirmText: 'Supprimer', danger: true });
    if (!ok) {
      return;
    }
    this.admin.deleteOrganizationType(t.code).subscribe({
      next: () => {
        this.types.update((list) => list.filter((x) => x.code !== t.code));
        this.notify.success('Type supprimé.');
      },
      error: (e) => void this.notify.error(e, 'Suppression impossible'),
    });
  }
}
