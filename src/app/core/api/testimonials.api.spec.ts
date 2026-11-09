import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestimonialsApi, ModeratedTestimonial } from './testimonials.api';
import { testimonialEdits } from '../../features/admin/testimonials/testimonials.component';
import { TestimonialFormComponent } from '../../features/public/testimonial/testimonial-form.component';
import { environment } from '../../../environments/environment';

const V2 = `${environment.apiUrl}/v2`;

describe('Témoignages', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('API : liste publique, dépôt, modération', () => {
    const api = TestBed.inject(TestimonialsApi);
    api.published(3).subscribe();
    expect(http.expectOne((r) => r.url === `${V2}/testimonials`).request.params.get('limit')).toBe('3');

    api.submit({ first_name: 'Awa', city: 'Thiès', role: 'owner', rating: 5, body: 'x'.repeat(30), consent: true, contact: null, locale: 'fr', website: '' }).subscribe();
    const post = http.expectOne(`${V2}/testimonials`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body.consent).toBe(true);

    api.moderation('approved', 2).subscribe();
    const list = http.expectOne((r) => r.url === `${V2}/testimonials/moderation`);
    expect(list.request.params.get('status')).toBe('approved');
    expect(list.request.params.get('page')).toBe('2');

    api.update('t1', { status: 'approved' }).subscribe();
    expect(http.expectOne(`${V2}/testimonials/t1`).request.method).toBe('PATCH');
    api.remove('t1').subscribe();
    expect(http.expectOne(`${V2}/testimonials/t1`).request.method).toBe('DELETE');
  });

  it('modération : seules les corrections réelles sont envoyées', () => {
    const t = { first_name: 'Awa', city: 'Thiès', body: 'Texte original suffisamment long.' } as ModeratedTestimonial;
    expect(testimonialEdits(t, { first_name: 'Awa ', city: 'Thiès', body: 'Texte original suffisamment long.' })).toEqual({});
    expect(testimonialEdits(t, { first_name: 'Awa', city: 'Thiès Nord', body: '' })).toEqual({ city: 'Thiès Nord' });
  });

  it("formulaire : accord de publication et texte d'au moins 20 caractères obligatoires", () => {
    const fixture = TestBed.createComponent(TestimonialFormComponent);
    const c = fixture.componentInstance;
    c.form.patchValue({ first_name: 'Awa', city: 'Thiès', body: 'Trop court' });
    c.submit();
    http.expectNone(`${V2}/testimonials`);
    expect(c.form.controls.consent.invalid).toBe(true);
    expect(c.form.controls.body.invalid).toBe(true);

    c.form.patchValue({ body: 'Ma carte a été retrouvée en deux jours, merci !', consent: true });
    c.setRating(4);
    c.submit();
    const req = http.expectOne(`${V2}/testimonials`);
    expect(req.request.body).toEqual(expect.objectContaining({ rating: 4, role: 'owner', consent: true, website: '', contact: null }));
    req.flush({ message: 'ok', uuid: 'u', status: 'pending' }, { status: 201, statusText: 'Created' });
    expect(c.sent()).toBe(true);
  });
});
