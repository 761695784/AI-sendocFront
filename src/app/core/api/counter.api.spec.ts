import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CounterApi } from './counter.api';
import { environment } from '../../../environments/environment';

const V2 = `${environment.apiUrl}/v2`;

describe('CounterApi', () => {
  let api: CounterApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(CounterApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('recherche de citoyen par téléphone', () => {
    api.searchCitizens({ phone: '771234567' }).subscribe();
    const req = http.expectOne((r) => r.url === `${V2}/citizens`);
    expect(req.request.params.get('phone')).toBe('771234567');
    req.flush([]);
  });

  it('compte DocTrack d’une personne : création avec email, renvoi du lien sans corps', () => {
    api.citizenAccount('c1', 'awa@example.sn').subscribe();
    expect(http.expectOne(`${V2}/citizens/c1/account`).request.body).toEqual({ email: 'awa@example.sn' });
    api.citizenAccount('c1').subscribe();
    expect(http.expectOne(`${V2}/citizens/c1/account`).request.body).toEqual({});
  });

  it('déclaration au guichet (JSON) et certificat en PDF', () => {
    api.declare({ citizen_profile_uuid: 'c1', items: [{ document_type_id: 1, first_name: 'Awa', last_name: 'Ndiaye' }] }).subscribe();
    const req = http.expectOne(`${V2}/declarations`);
    expect(req.request.body.items[0].document_type_id).toBe(1);
    req.flush({ uuid: 'd1' });

    api.certificatePdf('d1').subscribe();
    const pdf = http.expectOne(`${V2}/declarations/d1/certificate`);
    expect(pdf.request.responseType).toBe('blob');
    pdf.flush(new Blob(['%PDF']));
  });

  it('files de travail : filtres vides ignorés', () => {
    api.collections(undefined, 2).subscribe();
    const req = http.expectOne((r) => r.url === `${V2}/collections`);
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ data: [] });

    api.matches().subscribe();
    expect(http.expectOne((r) => r.url === `${V2}/matches`).request.params.get('status')).toBe('pending_review');
  });

  it('restitution, retrait et frais : bons verbes et corps', () => {
    api.restitute('doc1', { recipient_type: 'owner', owner: { first_name: 'A', last_name: 'B', ocr_scan_id: 's1' }, checks: { identity_photo_matches: true } }).subscribe();
    expect(http.expectOne(`${V2}/found-documents/doc1/restitution`).request.body.owner.ocr_scan_id).toBe('s1');

    api.recordContact('c1', 'no_answer').subscribe();
    expect(http.expectOne(`${V2}/collections/c1/contact`).request.body).toEqual({ outcome: 'no_answer', note: null });

    api.payCash('f1', 5000).subscribe();
    expect(http.expectOne(`${V2}/charges/f1/cash`).request.body).toEqual({ amount_received: 5000 });

    api.scan(new Blob(['x']), 'identity_check').subscribe();
    expect((http.expectOne(`${V2}/ocr/scan`).request.body as FormData).get('purpose')).toBe('identity_check');
  });
});
