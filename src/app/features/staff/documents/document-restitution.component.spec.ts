import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { StaffDocumentRestitutionComponent } from './document-restitution.component';
import { toIsoDate } from './document-deposit.component';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { environment } from '../../../../environments/environment';

const V2 = `${environment.apiUrl}/v2`;

describe('Restitution au guichet', () => {
  it('convertit les dates lues sur la pièce', () => {
    expect(toIsoDate('12/05/1985')).toBe('1985-05-12');
    expect(toIsoDate('1985-05-12')).toBe('1985-05-12');
    expect(toIsoDate('mai 1985')).toBeNull();
  });

  it('pré-remplit le titulaire puis demande la dérogation motivée quand l’API l’exige', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotifyService, useValue: { info: vi.fn(), error: vi.fn(), success: vi.fn() } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StaffDocumentRestitutionComponent);
    fixture.componentRef.setInput('uuid', 'doc1');
    fixture.detectChanges();

    http.expectOne(`${V2}/found-documents/doc1/restitution`).flush({
      document: { uuid: 'doc1', reference: 'TR-1', document_type: 'CNI', owner_first_name: 'Awa', owner_last_name: 'Ndiaye', birth_date: null, doc_number_last4: '0123', lifecycle_status: 'in_custody' },
      confirmed_match: { uuid: 'm1', declaration_reference: 'DT-1', declared_by: 'Awa Ndiaye' },
      proxy_allowed: true,
      requirements: ['Pièce d’identité'],
      can_restitute: true,
      blocking_reason: null,
    });
    fixture.detectChanges();

    const cmp = fixture.componentInstance;
    expect(cmp.form.controls.owner.controls.last_name.value).toBe('Ndiaye');

    cmp.form.patchValue({ identity_photo_matches: true, owner: { first_name: 'Aïssatou', id_type: 'cni', id_number: '1751199000123' } });
    cmp.submit();
    http
      .expectOne(`${V2}/found-documents/doc1/restitution`)
      .flush({ message: 'Données invalides', errors: { name_override_reason: ['Le nom ne correspond pas (68 %).'] } }, { status: 422, statusText: 'Unprocessable' });
    fixture.detectChanges();

    expect(cmp.needNameOverride()).toContain('ne correspond pas');
    expect(fixture.nativeElement.querySelector('#ov-name')).not.toBeNull();

    cmp.form.patchValue({ name_override_reason: 'Nom d’usage vérifié sur l’extrait de naissance' });
    cmp.submit();
    const second = http.expectOne(`${V2}/found-documents/doc1/restitution`);
    expect(second.request.body.name_override_reason).toContain('extrait');
    second.flush({ uuid: 'r1', reference: 'RS-1', status: 'completed', recipient_type: 'owner', owner: { name: 'Aïssatou Ndiaye' }, organization: { uuid: 'o', name: 'X' }, signed_scan: false, verification_code: 'ABCD' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Restitution enregistrée');
    http.verify();
  });
});
