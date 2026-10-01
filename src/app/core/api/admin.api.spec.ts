import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminApi } from './admin.api';
import { PilotApi } from './pilot.api';
import { environment } from '../../../environments/environment';
import { narrativeEdits } from '../../features/admin/narrative-review/narrative-review.component';
import { slugCode } from '../../features/admin/organization-types/organization-types.component';
import { fcfa } from '../../features/admin/billing/billing.component';

const V2 = `${environment.apiUrl}/v2`;

describe('AdminApi', () => {
  let api: AdminApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AdminApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('types de structure : création, renommage (PATCH), suppression', () => {
    api.createOrganizationType({ code: 'brigade', name: 'Brigade', level: 'structure' }).subscribe();
    expect(http.expectOne(`${V2}/organization-types`).request.body).toEqual({ code: 'brigade', name: 'Brigade', level: 'structure' });
    api.updateOrganizationType('brigade', { name: 'Brigade territoriale' }).subscribe();
    expect(http.expectOne(`${V2}/organization-types/brigade`).request.method).toBe('PATCH');
    api.deleteOrganizationType('brigade').subscribe();
    expect(http.expectOne(`${V2}/organization-types/brigade`).request.method).toBe('DELETE');
  });

  it('synthèse IA : valider avec corrections, rejeter avec motif, relancer', () => {
    api.approveNarrative('r1', { summary_fr: 'Texte corrigé de la synthèse du mois.', note: 'RAS' }).subscribe();
    expect(http.expectOne(`${V2}/reports/r1/narrative/approve`).request.body.note).toBe('RAS');
    api.rejectNarrative('r1', 'Chiffres mal interprétés').subscribe();
    expect(http.expectOne(`${V2}/reports/r1/narrative/reject`).request.body).toEqual({ note: 'Chiffres mal interprétés' });
    api.regenerateNarrative('r1').subscribe();
    expect(http.expectOne(`${V2}/reports/r1/narrative/regenerate`).request.method).toBe('POST');
  });

  it('file des synthèses à valider', () => {
    TestBed.inject(PilotApi).reports({ narrative_status: 'pending' }).subscribe();
    expect(http.expectOne((r) => r.url === `${V2}/reports`).request.params.get('narrative_status')).toBe('pending');
  });

  it('tarifs et rapport de reversement (JSON et CSV)', () => {
    api.setPrice({ service: 'counter_declaration', amount: 2000, authority_share_pct: 60, institution_uuid: null }).subscribe();
    expect(http.expectOne(`${V2}/billing/prices`).request.body.amount).toBe(2000);

    api.billingReport({ month: '2026-09', organization: null }).subscribe();
    const req = http.expectOne((r) => r.url === `${V2}/billing/report`);
    expect(req.request.params.get('month')).toBe('2026-09');
    expect(req.request.params.has('organization')).toBe(false);
    req.flush({});

    api.billingReportCsv({ month: '2026-09' }).subscribe();
    const csv = http.expectOne((r) => r.url === `${V2}/billing/report`);
    expect(csv.request.params.get('format')).toBe('csv');
    expect(csv.request.responseType).toBe('blob');
    csv.flush(new Blob(['x']));
  });
});

describe('Administration : règles d’affichage', () => {
  it('seules les parties modifiées de la synthèse sont envoyées', () => {
    const original = { summary_fr: 'Synthèse du mois.', highlights: ['A', 'B'], recommendations: [{ priority: 'haute' as const, text: 'Relancer Pikine' }] };
    expect(narrativeEdits(original, { summary_fr: 'Synthèse du mois. ', summary_en: '', highlights: 'A\nB\n', recommendations: [{ priority: 'haute', text: 'Relancer Pikine' }] })).toEqual({});
    expect(
      narrativeEdits(original, { summary_fr: 'Autre texte', summary_en: '', highlights: 'A', recommendations: [{ priority: 'moyenne', text: 'Relancer Pikine' }, { priority: 'basse', text: ' ' }] }),
    ).toEqual({ summary_fr: 'Autre texte', highlights: ['A'], recommendations: [{ priority: 'moyenne', text: 'Relancer Pikine' }] });
  });

  it('code proposé pour un type de structure', () => {
    expect(slugCode('Brigade de Gendarmerie')).toBe('brigade_de_gendarmerie');
    expect(slugCode('  Mairie d’arrondissement ! ')).toBe('mairie_d_arrondissement');
    expect(slugCode('Échelon régional')).toBe('echelon_regional');
  });

  it('montants en FCFA', () => {
    expect(fcfa(3000)).toBe('3 000 FCFA');
    expect(fcfa(0)).toBe('0 FCFA');
  });
});
