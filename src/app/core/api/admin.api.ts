import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiV2Client } from './api-v2.client';
import { ActivityReport, OrganizationType } from './pilot.types';
import { BillingReport, BillingServices, NarrativeEdits, NewPrice, PriceRule } from './admin.types';

/** Période d'un rapport de reversement : un mois (AAAA-MM) ou from/to, et une institution facultative. */
export interface BillingQuery {
  month?: string | null;
  from?: string | null;
  to?: string | null;
  organization?: string | null;
}

/**
 * Routes V2 réservées au super administrateur : types de structure,
 * validation des synthèses IA des rapports, tarifs et rapport de reversement.
 */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly api = inject(ApiV2Client);

  // ── Types de structure ───────────────────────────────────────────
  createOrganizationType(data: OrganizationType): Observable<OrganizationType> {
    return this.api.post<OrganizationType>(['organization-types'], data);
  }

  updateOrganizationType(code: string, data: Partial<OrganizationType>): Observable<OrganizationType> {
    return this.api.patch<OrganizationType>(['organization-types', code], data);
  }

  deleteOrganizationType(code: string): Observable<{ success: boolean }> {
    return this.api.delete(['organization-types', code]);
  }

  // ── Synthèses IA des rapports ────────────────────────────────────
  approveNarrative(uuid: string, edits: NarrativeEdits = {}): Observable<ActivityReport> {
    return this.api.post<ActivityReport>(['reports', uuid, 'narrative', 'approve'], edits);
  }

  rejectNarrative(uuid: string, note: string): Observable<ActivityReport> {
    return this.api.post<ActivityReport>(['reports', uuid, 'narrative', 'reject'], { note });
  }

  regenerateNarrative(uuid: string): Observable<ActivityReport> {
    return this.api.post<ActivityReport>(['reports', uuid, 'narrative', 'regenerate']);
  }

  // ── Tarifs et reversements ───────────────────────────────────────
  billingServices(): Observable<BillingServices> {
    return this.api.get<BillingServices>(['billing', 'services']);
  }

  setPrice(data: NewPrice): Observable<PriceRule> {
    return this.api.post<PriceRule>(['billing', 'prices'], data);
  }

  billingReport(q: BillingQuery = {}): Observable<BillingReport> {
    return this.api.get<BillingReport>(['billing', 'report'], { ...q });
  }

  billingReportCsv(q: BillingQuery = {}): Observable<Blob> {
    return this.api.blob(['billing', 'report'], { ...q, format: 'csv' });
  }
}
