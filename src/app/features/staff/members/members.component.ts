import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PilotApi } from '../../../core/api/pilot.api';
import { MemberRole, MembershipView, NewMember, Organization, ROLE_LABELS } from '../../../core/api/pilot.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { SessionStore } from '../../../core/session/session.store';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { spaceBase } from '../shared/space-base';
import { fieldError, normalizeSenegalPhone, personNameValidator, senegalPhoneValidator } from '../../../shared/forms/validators';

/**
 * Rôles que l'utilisateur peut attribuer dans cette organisation
 * (règles de l'API : config doctrack_access.assignable_roles + niveau de l'organisation).
 */
export function assignableRoles(myRole: string | null | undefined, level: string | undefined): MemberRole[] {
  const byMe: MemberRole[] =
    myRole === 'super_admin' || myRole === 'institution_admin'
      ? ['institution_admin', 'structure_manager', 'agent']
      : myRole === 'structure_manager'
        ? ['agent']
        : [];
  return byMe.filter((role) =>
    role === 'institution_admin' ? level !== 'structure' : role === 'structure_manager' ? level === 'structure' : true,
  );
}

/**
 * Membres d'une organisation (par défaut la structure active ; ?organisation=<uuid> depuis l'écran Structures) :
 * comptes nominatifs, rôles, matricule. Ajout avec invitation par email, modification, fin d'affectation.
 */
@Component({
  selector: 'app-staff-members',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, PageHeaderComponent, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './members.component.html',
})
export class StaffMembersComponent {
  private readonly api = inject(PilotApi);
  private readonly notify = inject(NotifyService);
  private readonly session = inject(SessionStore);
  private readonly fb = inject(FormBuilder);

  /** Organisation demandée dans l'adresse (?organisation=uuid), sinon la structure active. */
  readonly organisation = input<string | undefined>();

  readonly org = signal<Organization | null>(null);
  readonly members = signal<MembershipView[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly includeEnded = signal(false);
  readonly showAdd = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<string | null>(null);

  readonly base = spaceBase();
  readonly roleLabels = ROLE_LABELS;
  readonly fieldError = fieldError;

  readonly orgUuid = computed(() => this.organisation() || this.session.activeOrganization()?.uuid || null);
  readonly canManage = computed(() => !!this.org()?.can?.manage_members);
  readonly roles = computed(() => assignableRoles(this.org()?.my_role, this.org()?.type?.level));
  readonly isOther = computed(() => !!this.organisation() && this.organisation() !== this.session.activeOrganization()?.uuid);

  readonly addForm = this.fb.nonNullable.group({
    LastName: ['', [Validators.required, Validators.maxLength(40), personNameValidator]],
    FirstName: ['', [Validators.required, Validators.maxLength(40), personNameValidator]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    Phone: ['', [Validators.required, senegalPhoneValidator]],
    role: ['agent' as MemberRole, Validators.required],
    matricule: ['', Validators.maxLength(50)],
    position: ['', Validators.maxLength(255)],
  });

  readonly editForm = this.fb.nonNullable.group({
    role: ['agent' as MemberRole],
    matricule: ['', Validators.maxLength(50)],
    position: ['', Validators.maxLength(255)],
  });

  constructor() {
    // Rechargement quand l'organisation change (changement de structure active ou d'adresse).
    effect(() => {
      const uuid = this.orgUuid();
      untracked(() => this.load(uuid));
    });
  }

  load(uuid = this.orgUuid()): void {
    if (!uuid) {
      this.loading.set(false);
      this.error.set('Choisissez d’abord une structure.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.api.organization(uuid).subscribe({
      next: (res) => {
        this.org.set(res.data);
        const roles = this.roles();
        if (roles.length && !roles.includes(this.addForm.controls.role.value)) {
          this.addForm.controls.role.setValue(roles[roles.length - 1]);
        }
        this.loadMembers();
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Organisation introuvable.'));
        this.loading.set(false);
      },
    });
  }

  loadMembers(): void {
    const uuid = this.org()?.uuid;
    if (!uuid) {
      return;
    }
    this.api.members(uuid, this.includeEnded()).subscribe({
      next: (m) => {
        this.members.set(m);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  toggleEnded(): void {
    this.includeEnded.update((v) => !v);
    this.loadMembers();
  }

  add(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const v = this.addForm.getRawValue();
    const payload: NewMember = {
      ...v,
      email: v.email.trim().toLowerCase(),
      FirstName: v.FirstName.trim(),
      LastName: v.LastName.trim(),
      Phone: normalizeSenegalPhone(v.Phone) ?? v.Phone.trim(),
      matricule: v.matricule.trim() || null,
      position: v.position.trim() || null,
    };
    this.saving.set(true);
    this.api.addMember(this.org()!.uuid, payload).subscribe({
      next: (m) => {
        this.saving.set(false);
        this.showAdd.set(false);
        this.addForm.reset({ role: this.roles()[this.roles().length - 1] ?? 'agent' });
        void this.notify.info(
          m.invitation_sent
            ? `${payload.FirstName} ${payload.LastName} est ajouté(e). Un email lui a été envoyé pour choisir son mot de passe.`
            : `${payload.FirstName} ${payload.LastName} avait déjà un compte : il (elle) est maintenant rattaché(e) à ${this.org()!.name}.`,
          'Membre ajouté',
        );
        this.loadMembers();
      },
      error: (e) => {
        this.saving.set(false);
        void this.notify.error(e);
      },
    });
  }

  startEdit(m: MembershipView): void {
    this.editing.set(m.uuid);
    this.editForm.setValue({ role: m.role, matricule: m.matricule ?? '', position: m.position ?? '' });
  }

  saveEdit(m: MembershipView): void {
    const v = this.editForm.getRawValue();
    const payload: Partial<NewMember> = { matricule: v.matricule.trim() || null, position: v.position.trim() || null };
    if (v.role !== m.role) {
      payload.role = v.role;
    }
    this.saving.set(true);
    this.api.updateMembership(m.uuid, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.editing.set(null);
        this.members.update((list) => list.map((x) => (x.uuid === m.uuid ? { ...x, ...updated } : x)));
        this.notify.success('Affectation mise à jour.');
      },
      error: (e) => {
        this.saving.set(false);
        void this.notify.error(e);
      },
    });
  }

  async end(m: MembershipView): Promise<void> {
    const name = `${m.user?.FirstName ?? ''} ${m.user?.LastName ?? ''}`.trim();
    const ok = await this.notify.confirm({
      title: `Mettre fin à l’affectation de ${name} ?`,
      text: 'L’historique est conservé. Sans autre affectation, son compte agent sera suspendu.',
      confirmText: 'Mettre fin',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.api.endMembership(m.uuid).subscribe({
      next: () => {
        this.notify.success('Affectation terminée.');
        this.loadMembers();
      },
      error: (e) => void this.notify.error(e),
    });
  }

  /** On ne se retire pas soi-même (évite de perdre l'accès par erreur). */
  isMe(m: MembershipView): boolean {
    return !!m.user && m.user.email === this.session.user()?.email;
  }
}
