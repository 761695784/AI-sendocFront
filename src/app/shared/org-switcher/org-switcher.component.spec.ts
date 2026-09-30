import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OrgSwitcherComponent } from './org-switcher.component';
import { SessionStore } from '../../core/session/session.store';
import { Membership } from '../../core/session/session.models';

const m = (uuid: string, primary = false): Membership => ({
  membership_uuid: `m-${uuid}`,
  role: uuid === 'A' ? 'agent' : 'structure_manager',
  is_primary: primary,
  organization: { uuid, name: `Structure ${uuid}` },
});

describe('OrgSwitcherComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  });

  it('une seule structure : simple affichage', async () => {
    TestBed.inject(SessionStore).start({ token: 't', user: { id: 1 }, organizations: [m('A', true)] });
    const fixture = TestBed.createComponent(OrgSwitcherComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dt-org--static')?.textContent).toContain('Structure A');
    expect(el.querySelector('button')).toBeNull();
  });

  it('plusieurs structures : le choix change la structure active', async () => {
    const session = TestBed.inject(SessionStore);
    session.start({ token: 't', user: { id: 1 }, organizations: [m('A', true), m('B')] });
    const fixture = TestBed.createComponent(OrgSwitcherComponent);
    let changed = '';
    fixture.componentInstance.changed.subscribe((x) => (changed = x.organization.uuid));
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.choose(m('B'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(session.activeOrganization()?.uuid).toBe('B');
    expect(changed).toBe('B');
    expect(fixture.nativeElement.textContent).toContain('Responsable de structure');
  });
});
