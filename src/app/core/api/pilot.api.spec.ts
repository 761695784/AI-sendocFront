import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PilotApi, inboxRoute } from './pilot.api';
import { environment } from '../../../environments/environment';
import { assignableRoles } from '../../features/staff/members/members.component';
import { lastDays, periodLabels } from '../../features/staff/stats/stats.component';
import { niceMax } from '../../features/staff/stats/column-chart.component';
import { alertDetails, alertSubjectRoute } from '../../features/staff/vigilance/vigilance.component';
import { previousMonth, reportLevel } from '../../features/staff/reports/reports.component';
import { childTypes } from '../../features/staff/structures/structures.component';

const V2 = `${environment.apiUrl}/v2`;

describe('PilotApi', () => {
  let api: PilotApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(PilotApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('boîte de réception : filtre non lus et lecture', () => {
    api.inbox(true, 2).subscribe();
    const req = http.expectOne((r) => r.url === `${V2}/inbox`);
    expect(req.request.params.get('unread')).toBe('1');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ data: [] });

    api.inbox().subscribe();
    expect(http.expectOne((r) => r.url === `${V2}/inbox`).request.params.has('unread')).toBe(false);

    api.markRead('m1').subscribe();
    expect(http.expectOne(`${V2}/inbox/m1/read`).request.method).toBe('POST');
    api.markAllRead().subscribe();
    expect(http.expectOne(`${V2}/inbox/read-all`).request.method).toBe('POST');
  });

  it('statistiques : périmètre, période, indicateur et export CSV', () => {
    api.timeseries('restitutions', 'month', { organization: 'o1', from: '2026-01-01', to: '2026-06-30' }).subscribe();
    const req = http.expectOne((r) => r.url === `${V2}/stats/timeseries`);
    expect(req.request.params.get('metric')).toBe('restitutions');
    expect(req.request.params.get('interval')).toBe('month');
    expect(req.request.params.get('organization')).toBe('o1');
    req.flush({ points: [] });

    api.structuresCsv({ from: '2026-01-01', to: '2026-01-31' }).subscribe();
    const csv = http.expectOne((r) => r.url === `${V2}/stats/structures`);
    expect(csv.request.params.get('format')).toBe('csv');
    expect(csv.request.params.has('organization')).toBe(false);
    expect(csv.request.responseType).toBe('blob');
    csv.flush(new Blob(['a;b']));
  });

  it('vigilance : décision avec motif', () => {
    api.decideAlert('a1', 'dismiss', 'Même personne, vérifié').subscribe();
    const req = http.expectOne(`${V2}/vigilance/alerts/a1/dismiss`);
    expect(req.request.body).toEqual({ note: 'Même personne, vérifié' });
    req.flush({});
  });

  it('rapports : génération d’un mois et fichiers', () => {
    api.generateReport({ organization: 'o1', month: '2026-08' }).subscribe();
    expect(http.expectOne(`${V2}/reports`).request.body).toEqual({ organization: 'o1', month: '2026-08' });

    api.reportFile('r1', 'xlsx').subscribe();
    http.expectOne(`${V2}/reports/r1/xlsx`).flush(new Blob(['x']));
  });

  it('structures et membres : PATCH et fin d’affectation', () => {
    api.updateOrganization('o1', { phone: '771234567' }).subscribe();
    expect(http.expectOne(`${V2}/organizations/o1`).request.method).toBe('PATCH');

    api.setOrganizationActive('o2', false).subscribe();
    http.expectOne(`${V2}/organizations/o2/deactivate`).flush({ data: {} });

    api.members('o1', true).subscribe();
    expect(http.expectOne((r) => r.url === `${V2}/organizations/o1/members`).request.params.get('include_ended')).toBe('1');

    api.updateMembership('ms1', { role: 'structure_manager' }).subscribe();
    expect(http.expectOne(`${V2}/memberships/ms1`).request.method).toBe('PATCH');
    api.endMembership('ms1').subscribe();
    expect(http.expectOne(`${V2}/memberships/ms1/end`).request.method).toBe('POST');
  });
});

describe('Pilotage : règles d’affichage', () => {
  it('liens des messages vers les écrans', () => {
    expect(inboxRoute('collections/abc')).toBe('/espace/retraits/abc');
    expect(inboxRoute('matches/xyz')).toBe('/espace/correspondances/xyz');
    expect(inboxRoute('reports/r1')).toBe('/espace/rapports/r1');
    expect(inboxRoute('inconnu/1')).toBeNull();
    expect(inboxRoute(null)).toBeNull();
  });

  it('rôles attribuables selon mon rôle et le niveau', () => {
    expect(assignableRoles('structure_manager', 'structure')).toEqual(['agent']);
    expect(assignableRoles('institution_admin', 'structure')).toEqual(['structure_manager', 'agent']);
    expect(assignableRoles('institution_admin', 'institution')).toEqual(['institution_admin', 'agent']);
    expect(assignableRoles('agent', 'structure')).toEqual([]);
  });

  it('types créables sous un parent', () => {
    const types = [
      { code: 'pn', name: 'Police', level: 'institution' as const },
      { code: 'dsp', name: 'Direction', level: 'intermediate' as const },
      { code: 'com', name: 'Commissariat', level: 'structure' as const },
    ];
    expect(childTypes(types, 'institution').map((t) => t.code)).toEqual(['dsp', 'com']);
    expect(childTypes(types, 'structure')).toEqual([]);
  });

  it('périodes et axe du graphique', () => {
    expect(lastDays(7, new Date(2026, 8, 30))).toEqual({ from: '2026-09-23', to: '2026-09-30' });
    expect(periodLabels('2026-W38', 'week')).toEqual({ label: 'S38', title: 'Semaine 38 (2026)' });
    expect(periodLabels('2026-09', 'month').label).toBe('sept. 26');
    expect(periodLabels('2026-09-05', 'day').label).toBe('5 sept.');
    expect(niceMax(0)).toBe(4);
    expect(niceMax(13)).toBe(20);
    expect(niceMax(170)).toBe(200);
    expect(previousMonth(new Date(2026, 0, 15))).toBe('2025-12');
  });

  it('alertes et rapports', () => {
    expect(alertSubjectRoute({ subject: { type: 'Document', uuid: 'd1', reference: 'DT-1' } })).toEqual(['/espace/documents', 'd1']);
    expect(alertSubjectRoute({ subject: { type: 'User', uuid: 'u1', reference: null } })).toBeNull();
    expect(alertDetails({ reason: 'même photo', number_changed: true, issues: ['a', 'b'] })).toEqual([
      { label: 'Motif', value: 'même photo' },
      { label: 'Numéro corrigé après lecture', value: 'oui' },
      { label: 'Points relevés', value: 'a, b' },
    ]);
    expect(reportLevel('critique').tone).toBe('danger');
    expect(reportLevel('bon').icon).toBe('fa-check-circle');
  });
});
