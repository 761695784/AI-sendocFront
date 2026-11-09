import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiV2Client } from './api-v2.client';

export type TestimonialRole = 'owner' | 'finder' | 'other';
export type TestimonialStatus = 'pending' | 'approved' | 'rejected';

/** Témoignage publié (ce que voit le public). */
export interface Testimonial {
  uuid: string;
  first_name: string;
  city: string;
  role: TestimonialRole;
  rating: number | null;
  body: string;
  verified: boolean;
  locale: string;
  published_at: string | null;
}

/** Témoignage vu par le super admin qui modère. */
export interface ModeratedTestimonial extends Testimonial {
  status: TestimonialStatus;
  contact: string | null;
  account: { name: string; email: string | null } | null;
  declaration: string | null;
  moderation_note: string | null;
  moderated_at: string | null;
  moderator: string | null;
  created_at: string | null;
}

export interface TestimonialPayload {
  first_name: string;
  city: string;
  role: TestimonialRole;
  rating: number | null;
  body: string;
  consent: boolean;
  contact: string | null;
  locale: string;
  /** Champ piège invisible (anti-robot) : toujours vide. */
  website: string;
}

export interface TestimonialEdits {
  status?: TestimonialStatus;
  first_name?: string;
  city?: string;
  body?: string;
  rating?: number | null;
  moderation_note?: string | null;
}

/**
 * Témoignages : lecture publique et dépôt (ouverts à tous, le jeton s'il existe identifie l'auteur),
 * modération par le super admin.
 */
@Injectable({ providedIn: 'root' })
export class TestimonialsApi {
  private readonly api = inject(ApiV2Client);

  published(limit = 6): Observable<{ data: Testimonial[]; stats: { count: number; average_rating: number | null } }> {
    return this.api.get(['testimonials'], { limit });
  }

  submit(payload: TestimonialPayload): Observable<{ message: string; uuid: string; status: TestimonialStatus }> {
    return this.api.post(['testimonials'], payload);
  }

  moderation(status: TestimonialStatus = 'pending', page = 1): Observable<{
    data: ModeratedTestimonial[];
    counts: Partial<Record<TestimonialStatus, number>>;
    meta: { current_page: number; last_page: number; total: number };
  }> {
    return this.api.get(['testimonials', 'moderation'], { status, page });
  }

  update(uuid: string, edits: TestimonialEdits): Observable<ModeratedTestimonial> {
    return this.api.patch(['testimonials', uuid], edits);
  }

  remove(uuid: string): Observable<{ message: string }> {
    return this.api.delete(['testimonials', uuid]);
  }
}
