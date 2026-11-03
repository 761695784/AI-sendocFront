import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CitizenApi } from './citizen.api';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

describe('CitizenApi', () => {
  let api: CitizenApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(CitizenApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('mes déclarations : documents retrouvés toujours présents', () => {
    let first: any;
    api.myDeclarations().subscribe((list) => (first = list[0]));
    http.expectOne(`${API}/my-declarations`).flush({ data: [{ uuid: 'd1', status: 'registered' }] });
    expect(first.found_documents).toEqual([]);
  });

  it('déclaration en ligne : JSON vers /declarations, récépissé en PDF', () => {
    api.declareLoss({ Title: 'Perte — Passeport', FirstNameInDoc: 'Awa', LastNameInDoc: 'Ndiaye', document_type_id: 2, lost_place: 'HLM' }).subscribe();
    const req = http.expectOne(`${API}/declarations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.lost_place).toBe('HLM');
    req.flush({ success: true, data: {} });

    api.certificatePdf('c1').subscribe();
    const pdf = http.expectOne(`${API}/certificats/c1/voir`);
    expect(pdf.request.responseType).toBe('blob');
    pdf.flush(new Blob(['%PDF']));
  });

  it('scan OCR : photo envoyée en multipart vers la V2', () => {
    api.scan(new Blob(['x'], { type: 'image/jpeg' })).subscribe();
    const req = http.expectOne(`${API}/v2/ocr/scan`);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('purpose')).toBe('found_document');
    expect(body.get('image')).toBeInstanceOf(Blob);
    req.flush({ scan_id: 's1' });
  });

  it('types de documents mis en cache (un seul appel)', () => {
    api.documentTypes().subscribe();
    api.documentTypes().subscribe();
    http.expectOne(`${API}/document-types`).flush([{ id: 1, TypeName: 'CNI' }]);
  });

  it('remises directes, QR et page publique', () => {
    api.declineRestitution('r1', 'Pas disponible').subscribe();
    expect(http.expectOne(`${API}/restitution-requests/r1/decline`).request.body).toEqual({ reason: 'Pas disponible' });

    api.renewTag('t1').subscribe({ error: () => undefined });
    http.expectOne(`${API}/document-tags/t1/renew`).flush({ message: 'Paiement requis' }, { status: 402, statusText: 'Payment Required' });

    api.publicTag('ABCDEFGHIJKLMNOPQRSTUV').subscribe();
    http.expectOne(`${API}/v2/tags/ABCDEFGHIJKLMNOPQRSTUV`).flush({ valid: true, message: 'ok' });

    api.verify(' cp-2026-1 ').subscribe();
    http.expectOne(`${API}/v2/verify/cp-2026-1`).flush({ found: false, status: 'unknown' });
  });
});
