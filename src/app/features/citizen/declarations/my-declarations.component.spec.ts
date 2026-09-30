import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MyDeclarationsComponent } from './my-declarations.component';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

describe('MyDeclarationsComponent', () => {
  it('affiche la marche à suivre selon l’endroit où se trouve le document', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MyDeclarationsComponent);
    fixture.detectChanges();

    http.expectOne(`${API}/my-declarations`).flush({
      data: [
        {
          uuid: 'd1', reference: 'DP-1', channel: 'online', status: 'matched', FirstNameInDoc: 'Awa', LastNameInDoc: 'Ndiaye',
          document_type: { id: 1, TypeName: 'CNI' }, created_at: '2026-09-01',
          found_documents: [{ uuid: 'f1', reference: 'DT-9', document_type: 'CNI', next_step: 'counter', lifecycle_status: 'in_custody',
            found_channel: 'counter', custody: { uuid: 'o', name: 'Commissariat de Dieuppeul', address: 'Dakar', phone: '338000000' }, restitution_request: null }],
        },
        {
          uuid: 'd2', reference: 'DP-2', channel: 'online', status: 'matched', FirstNameInDoc: 'Awa', LastNameInDoc: 'Ndiaye',
          document_type: { id: 2, TypeName: 'Passeport' }, created_at: '2026-09-02',
          found_documents: [{ uuid: 'f2', reference: 'DT-10', document_type: 'Passeport', next_step: 'direct', lifecycle_status: 'matched',
            found_channel: 'citizen', custody: null, restitution_request: null }],
        },
      ],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Commissariat de Dieuppeul');
    expect(text).toContain('DT-9');
    expect(text).toContain('Demander la restitution');
    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(2);
  });
});
