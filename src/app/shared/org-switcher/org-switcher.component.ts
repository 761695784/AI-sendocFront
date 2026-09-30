import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { SessionStore } from '../../core/session/session.store';
import { MEMBERSHIP_ROLE_LABELS, Membership } from '../../core/session/session.models';

/**
 * Sélecteur de structure pour un agent rattaché à plusieurs structures.
 * Change l'en-tête X-Organization envoyé à l'API. Avec une seule structure : simple affichage.
 */
@Component({
  selector: 'app-org-switcher',
  imports: [NgbDropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (active(); as current) {
      @if (memberships().length > 1) {
        <div ngbDropdown class="d-inline-block" placement="bottom-end">
          <button type="button" class="dt-org" ngbDropdownToggle [attr.aria-label]="'Structure active : ' + current.organization.name">
            <i class="fas fa-building" aria-hidden="true"></i>
            <span class="dt-org__text">
              <strong>{{ current.organization.name }}</strong>
              <small>{{ roleLabel(current) }}</small>
            </span>
          </button>
          <div ngbDropdownMenu class="dt-org__menu">
            <h6 class="dropdown-header">Agir au nom de…</h6>
            @for (m of memberships(); track m.membership_uuid) {
              <button ngbDropdownItem type="button" (click)="choose(m)"
                [class.active]="m.organization.uuid === current.organization.uuid">
                <strong>{{ m.organization.name }}</strong>
                <small class="d-block">{{ roleLabel(m) }}{{ m.is_primary ? ' · principale' : '' }}</small>
              </button>
            }
          </div>
        </div>
      } @else {
        <span class="dt-org dt-org--static">
          <i class="fas fa-building" aria-hidden="true"></i>
          <span class="dt-org__text">
            <strong>{{ current.organization.name }}</strong>
            <small>{{ roleLabel(current) }}</small>
          </span>
        </span>
      }
    }
  `,
  styles: `
    .dt-org { display: inline-flex; align-items: center; gap: .6rem; padding: .35rem .75rem; border-radius: .6rem;
      border: 1px solid #d8dee6; background: #fff; color: #1c2430; max-width: 22rem; text-align: left; }
    .dt-org--static { cursor: default; }
    .dt-org__text { display: flex; flex-direction: column; min-width: 0; line-height: 1.15; }
    .dt-org__text strong { font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dt-org__text small { font-size: .75rem; color: #5f6b7a; }
    .dt-org__menu { min-width: 18rem; }
    .dt-org__menu small { color: inherit; opacity: .75; }
  `,
})
export class OrgSwitcherComponent {
  private readonly session = inject(SessionStore);

  /** Émis après un changement de structure (l'écran recharge ses données). */
  readonly changed = output<Membership>();

  readonly memberships = this.session.memberships;
  readonly active = computed(() => this.session.activeMembership());

  roleLabel(m: Membership): string {
    return MEMBERSHIP_ROLE_LABELS[m.role] ?? m.role;
  }

  choose(m: Membership): void {
    if (m.organization.uuid === this.active()?.organization.uuid) {
      return;
    }
    this.session.setActiveOrganization(m.organization.uuid);
    this.changed.emit(m);
  }
}
