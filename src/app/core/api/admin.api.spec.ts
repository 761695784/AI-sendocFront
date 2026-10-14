import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminApi } from './admin.api';
import { PilotApi } from './pilot.api';
import { environment } from '../../../environments/environment';
import { narrativeEdits } from '../../features/admin/narrative-review/narrative-review.component';
import { slugCode } from '../../features/admin/organization-types/organization-types.component';
import { fcfa } from '../../features/admin/billing/billing.component';
import { voicesToGenerate } from '../../features/admin/assistant-voices/assistant-voices.component';
import { toBars } from '../../features/admin/home/admin-home.component';
import { initialsOf } from '../../features/admin/shell/admin-shell.component';
import { filterStructureRows } from '../../features/staff/stats/stats.component';
import { StructureRow } from './pilot.types';

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

  it('voix de l’assistant : état, génération et retrait d’une phrase', () => {
    api.assistantVoices().subscribe();
    expect(http.expectOne((r) => r.url === `${V2}/assistant/voices`).request.params.get('lang')).toBe('wo');
    api.generateVoice('wo', 'welcome').subscribe();
    expect(http.expectOne(`${V2}/assistant/voices/wo/welcome`).request.method).toBe('POST');
    api.removeVoice('wo', 'welcome').subscribe();
    expect(http.expectOne(`${V2}/assistant/voices/wo/welcome`).request.method).toBe('DELETE');
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

  it('voix à générer : phrases sans audio ou dont le texte a changé', () => {
    expect(voicesToGenerate([{ key: 'a', state: 'ready' }, { key: 'b', state: 'missing' }, { key: 'c', state: 'stale' }, { key: 'd', state: 'manual' }])).toEqual(['b', 'c']);
  });

  it('montants en FCFA', () => {
    expect(fcfa(3000)).toBe('3 000 FCFA');
    expect(fcfa(0)).toBe('0 FCFA');
  });

  it('initiales du compte', () => {
    expect(initialsOf('Malang Marna')).toBe('MM');
    expect(initialsOf('awa')).toBe('AW');
    expect(initialsOf('')).toBe('?');
  });

  it('répartitions de l’accueil : réponses des anciens services', () => {
    expect(toBars({ data: [{ typeName: 'Passeport', count: '3' }] }, 'typeName')).toEqual([{ label: 'Passeport', value: 3 }]);
    expect(toBars([{ subject: 'Demande de restitution', count: 5 }], 'subject')).toEqual([{ label: 'Demande de restitution', value: 5 }]);
    expect(toBars(null, 'subject')).toEqual([]);
  });

  it('comparaison des structures : actives d’abord, recherche sans accents', () => {
    const r = (name: string, n: number): StructureRow => ({ uuid: name, name, parent: 'Gendarmerie nationale', is_active: true, collections_assigned: n, median_first_contact_hours: null,
      contacted_within_sla_pct: null, collections_overdue_now: 0, collected: 0, median_hours_to_collect: null, in_custody_now: 0, pending_reviews_now: 0, counter_declarations: 0, restitutions: 0 });
    const rows = [r('Brigade de Kédougou', 0), r('Brigade de Thiès', 2), r('Brigade de Mbour', 5)];
    expect(filterStructureRows(rows, '', true).map((x) => x.name)).toEqual(['Brigade de Mbour', 'Brigade de Thiès']);
    expect(filterStructureRows(rows, 'kedougou', false).map((x) => x.name)).toEqual(['Brigade de Kédougou']);
  });
});
