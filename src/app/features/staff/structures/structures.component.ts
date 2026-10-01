import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PilotApi } from '../../../core/api/pilot.api';
import { LEVEL_LABELS, Organization, OrganizationPayload, OrganizationType, ResourcePage, Territory } from '../../../core/api/pilot.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';
import { currentPosition, isInSenegal } from '../../../shared/media/geolocation';
import { spaceBase } from '../shared/space-base';
import { fieldError, normalizeSenegalPhone, senegalPhoneValidator } from '../../../shared/forms/validators';

/** Types qu'on peut créer sous un parent donné (une structure n'a pas d'enfant, une institution est une racine). */
export function childTypes(types: OrganizationType[], parentLevel: string | undefined): OrganizationType[] {
  if (!parentLevel || parentLevel === 'structure') {
    return [];
  }
  return types.filter((t) => t.level !== 'institution');
}

/** Création sous un parent, ou d'une institution (racine, super admin : parent null). */
type FormMode = { kind: 'create'; parent: Organization | null } | { kind: 'edit'; org: Organization };

/**
 * Arbre des organisations du périmètre (institution → directions → structures) :
 * créer une sous-structure, modifier ses coordonnées, l'activer ou la désactiver, gérer ses membres.
 */
@Component({
  selector: 'app-staff-structures',
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './structures.component.html',
  styles: `
    .org-name { display: flex; align-items: center; gap: .4rem; }
    .org-name i { color: #9aa5b1; }
    .org-row--off td { color: #8a94a0; }
    .org-row--current { background: #fffaf0; }
  `,
})
export class StaffStructuresComponent implements OnInit {
  private readonly api = inject(PilotApi);
  private readonly notify = inject(NotifyService);
  private readonly session = inject(SessionStore);
  private readonly fb = inject(FormBuilder);

  readonly page = signal<ResourcePage<Organization> | null>(null);
  readonly types = signal<OrganizationType[]>([]);
  readonly territories = signal<Territory[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mode = signal<FormMode | null>(null);
  readonly saving = signal(false);
  readonly locating = signal(false);
  readonly busy = signal<string | null>(null);
  search = '';
  showInactive = false;

  readonly base = spaceBase();
  readonly levelLabels = LEVEL_LABELS;
  readonly fieldError = fieldError;
  readonly isSuperAdmin = this.session.isSuperAdmin;
  readonly canToggle = computed(() => {
    this.session.abilities();
    return this.session.can('organizations.toggle');
  });
  readonly activeUuid = computed(() => this.session.activeOrganization()?.uuid ?? null);

  /** Profondeur de départ (pour indenter l'arbre à partir de la racine visible). */
  readonly baseDepth = computed(() => Math.min(...(this.page()?.data ?? []).map((o) => o.depth ?? 0), 99));
  readonly formTypes = computed(() => {
    const m = this.mode();
    if (!m) {
      return [];
    }
    if (m.kind === 'edit') {
      return this.types().filter((t) => t.level === m.org.type?.level);
    }
    return m.parent ? childTypes(this.types(), m.parent.type?.level) : this.types().filter((t) => t.level === 'institution');
  });
  readonly departments = computed(() => this.territories().filter((t) => t.level !== 'region'));

  readonly form = this.fb.nonNullable.group({
    organization_type: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    code: ['', Validators.maxLength(50)],
    territory_code: [''],
    address: ['', Validators.maxLength(255)],
    phone: ['', senegalPhoneValidator],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    latitude: [null as number | null],
    longitude: [null as number | null],
    accepts_collections: [true],
  });

  ngOnInit(): void {
    forkJoin({ types: this.api.organizationTypes(), territories: this.api.territories() }).subscribe({
      next: (r) => {
        this.types.set(r.types);
        this.territories.set(r.territories);
      },
      error: () => void 0,
    });
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.organizations({ q: this.search.trim() || undefined, include_inactive: this.showInactive, page }).subscribe({
      next: (p) => {
        this.page.set(p);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  indent(o: Organization): number {
    return Math.max(0, (o.depth ?? 0) - this.baseDepth());
  }

  canAddChild(o: Organization): boolean {
    return !!o.can?.create_child && o.is_active && o.type?.level !== 'structure';
  }

  openCreate(parent: Organization | null): void {
    this.mode.set({ kind: 'create', parent });
    const types = this.formTypes();
    const firstType = types.find((t) => t.level === 'structure') ?? types[0];
    this.form.reset({
      organization_type: firstType?.code ?? '',
      name: '',
      code: '',
      territory_code: parent?.territory?.code ?? '',
      address: '',
      phone: '',
      email: '',
      latitude: null,
      longitude: null,
      accepts_collections: true,
    });
    this.form.controls.organization_type.enable();
    this.scrollToForm();
  }

  openEdit(o: Organization): void {
    this.mode.set({ kind: 'edit', org: o });
    this.form.reset({
      organization_type: o.type?.code ?? '',
      name: o.name,
      code: o.code ?? '',
      territory_code: o.territory?.code ?? '',
      address: o.address ?? '',
      phone: o.phone ?? '',
      email: o.email ?? '',
      latitude: o.latitude,
      longitude: o.longitude,
      accepts_collections: o.accepts_collections,
    });
    this.form.controls.organization_type.disable(); // le type ne change pas ici
    this.scrollToForm();
  }

  private scrollToForm(): void {
    setTimeout(() => document.getElementById('org-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async locate(): Promise<void> {
    this.locating.set(true);
    try {
      const p = await currentPosition();
      if (!isInSenegal(p)) {
        void this.notify.error('La position trouvée est hors du Sénégal.');
      } else {
        this.form.patchValue({ latitude: p.latitude, longitude: p.longitude });
        this.notify.success(`Position enregistrée (précision ${p.accuracy} m).`);
      }
    } catch (e) {
      void this.notify.error((e as Error).message);
    } finally {
      this.locating.set(false);
    }
  }

  save(): void {
    const m = this.mode();
    if (!m) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const lat = v.latitude === null || (v.latitude as unknown) === '' ? null : Number(v.latitude);
    const lng = v.longitude === null || (v.longitude as unknown) === '' ? null : Number(v.longitude);
    if ((lat === null) !== (lng === null) || (lat !== null && !isInSenegal({ latitude: lat, longitude: lng! }))) {
      void this.notify.error('Indiquez la latitude et la longitude (au Sénégal), ou laissez les deux vides.');
      return;
    }
    const payload: OrganizationPayload = {
      name: v.name.trim(),
      code: v.code.trim() || null,
      territory_code: v.territory_code || null,
      address: v.address.trim() || null,
      phone: v.phone.trim() ? (normalizeSenegalPhone(v.phone) ?? v.phone.trim()) : null,
      email: v.email.trim() || null,
      latitude: lat,
      longitude: lng,
      accepts_collections: v.accepts_collections,
    };
    this.saving.set(true);
    const request =
      m.kind === 'create'
        ? this.api.createOrganization({ ...payload, organization_type: v.organization_type, parent_uuid: m.parent?.uuid ?? null })
        : this.api.updateOrganization(m.org.uuid, payload);
    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.mode.set(null);
        this.notify.success(m.kind === 'create' ? `${res.data.name} créée.` : 'Modifications enregistrées.');
        this.load(this.page()?.meta.current_page ?? 1);
      },
      error: (e) => {
        this.saving.set(false);
        void this.notify.error(e);
      },
    });
  }

  async toggle(o: Organization): Promise<void> {
    const ok = await this.notify.confirm(
      o.is_active
        ? {
            title: `Désactiver ${o.name} ?`,
            text: 'Elle ne recevra plus de retraits ni de nouvelles déclarations. Ses données et son historique sont conservés.',
            confirmText: 'Désactiver',
            danger: true,
          }
        : { title: `Réactiver ${o.name} ?`, confirmText: 'Réactiver' },
    );
    if (!ok) {
      return;
    }
    this.busy.set(o.uuid);
    this.api.setOrganizationActive(o.uuid, !o.is_active).subscribe({
      next: () => {
        this.busy.set(null);
        this.notify.success(o.is_active ? 'Organisation désactivée.' : 'Organisation réactivée.');
        this.load(this.page()?.meta.current_page ?? 1);
      },
      error: (e) => {
        this.busy.set(null);
        void this.notify.error(e);
      },
    });
  }
}
