import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiV2Client } from './api-v2.client';
import { QueryParams } from './api.types';
import { LaravelPage } from './counter.types';
import {
  ActivityReport,
  AlertStatus,
  DeliveriesSummary,
  InboxMessage,
  MembershipView,
  NewMember,
  NotificationDelivery,
  Organization,
  OrganizationPayload,
  OrganizationType,
  OverdueCollections,
  ResourcePage,
  StatsOverview,
  StructuresStats,
  Territory,
  Timeseries,
  TimeseriesMetric,
  VigilanceAlert,
  VigilanceList,
} from './pilot.types';

/** Période et périmètre des statistiques (organization = uuid ; vide = périmètre par défaut / national). */
export interface StatsQuery {
  organization?: string | null;
  from?: string | null;
  to?: string | null;
}

/**
 * Routes V2 du pilotage : boîte de réception, statistiques et délais, vigilance,
 * rapports d'activité, structures et membres, suivi des envois.
 */
@Injectable({ providedIn: 'root' })
export class PilotApi {
  private readonly api = inject(ApiV2Client);

  // ── Boîte de réception ───────────────────────────────────────────
  inbox(unreadOnly = false, page = 1): Observable<LaravelPage<InboxMessage>> {
    return this.api.get<LaravelPage<InboxMessage>>(['inbox'], { unread: unreadOnly ? 1 : null, page });
  }

  unreadCount(): Observable<{ unread: number }> {
    return this.api.get<{ unread: number }>(['inbox', 'unread-count']);
  }

  markRead(uuid: string): Observable<{ uuid: string; is_read: boolean }> {
    return this.api.post(['inbox', uuid, 'read']);
  }

  markAllRead(): Observable<{ marked: number }> {
    return this.api.post(['inbox', 'read-all']);
  }

  // ── Statistiques ─────────────────────────────────────────────────
  overview(q: StatsQuery = {}): Observable<StatsOverview> {
    return this.api.get<StatsOverview>(['stats', 'overview'], q as QueryParams);
  }

  structures(q: StatsQuery = {}): Observable<StructuresStats> {
    return this.api.get<StructuresStats>(['stats', 'structures'], q as QueryParams);
  }

  structuresCsv(q: StatsQuery = {}): Observable<Blob> {
    return this.api.blob(['stats', 'structures'], { ...q, format: 'csv' } as QueryParams);
  }

  timeseries(metric: TimeseriesMetric, interval: 'day' | 'week' | 'month', q: StatsQuery = {}): Observable<Timeseries> {
    return this.api.get<Timeseries>(['stats', 'timeseries'], { ...q, metric, interval } as QueryParams);
  }

  overdueCollections(organization?: string | null): Observable<OverdueCollections> {
    return this.api.get<OverdueCollections>(['stats', 'overdue-collections'], { organization });
  }

  // ── Vigilance ────────────────────────────────────────────────────
  alerts(query: { status?: AlertStatus; level?: string; kind?: string; page?: number; per_page?: number } = {}): Observable<VigilanceList> {
    return this.api.get<VigilanceList>(['vigilance', 'alerts'], query);
  }

  alert(uuid: string): Observable<VigilanceAlert> {
    return this.api.get<VigilanceAlert>(['vigilance', 'alerts', uuid]);
  }

  /** Décision sur une alerte : confirmer (fraude/doublon avéré) ou écarter (fausse alerte). Note obligatoire (5 caractères min.). */
  decideAlert(uuid: string, decision: 'confirm' | 'dismiss', note: string): Observable<VigilanceAlert> {
    return this.api.post<VigilanceAlert>(['vigilance', 'alerts', uuid, decision], { note });
  }

  // ── Rapports d'activité ──────────────────────────────────────────
  reports(query: { organization?: string | null; national?: boolean; narrative_status?: string | null; page?: number } = {}): Observable<LaravelPage<ActivityReport>> {
    return this.api.get<LaravelPage<ActivityReport>>(['reports'], { ...query, national: query.national ? 1 : null });
  }

  report(uuid: string): Observable<ActivityReport> {
    return this.api.get<ActivityReport>(['reports', uuid]);
  }

  /** Génère un rapport : un mois (AAAA-MM), une année, ou une période from/to. */
  generateReport(data: { organization?: string | null; month?: string; year?: number; from?: string; to?: string }): Observable<ActivityReport> {
    return this.api.post<ActivityReport>(['reports'], data);
  }

  reportFile(uuid: string, format: 'pdf' | 'xlsx'): Observable<Blob> {
    return this.api.blob(['reports', uuid, format]);
  }

  deleteReport(uuid: string): Observable<{ deleted: boolean }> {
    return this.api.delete(['reports', uuid]);
  }

  // ── Référentiels ─────────────────────────────────────────────────
  organizationTypes(): Observable<OrganizationType[]> {
    return this.api.get<OrganizationType[]>(['organization-types']);
  }

  territories(query: { level?: string; parent?: string } = {}): Observable<Territory[]> {
    return this.api.get<Territory[]>(['territories'], query);
  }

  // ── Structures ───────────────────────────────────────────────────
  organizations(query: { type?: string; level?: string; parent?: string; institution?: string; region?: string; territory?: string; q?: string; include_inactive?: boolean; page?: number } = {}): Observable<ResourcePage<Organization>> {
    return this.api.get<ResourcePage<Organization>>(['organizations'], { ...query, include_inactive: query.include_inactive ? 1 : null });
  }

  organization(uuid: string): Observable<{ data: Organization }> {
    return this.api.get<{ data: Organization }>(['organizations', uuid]);
  }

  createOrganization(data: OrganizationPayload): Observable<{ data: Organization }> {
    return this.api.post<{ data: Organization }>(['organizations'], data);
  }

  updateOrganization(uuid: string, data: OrganizationPayload): Observable<{ data: Organization }> {
    return this.api.patch<{ data: Organization }>(['organizations', uuid], data);
  }

  setOrganizationActive(uuid: string, active: boolean): Observable<{ data: Organization }> {
    return this.api.post<{ data: Organization }>(['organizations', uuid, active ? 'activate' : 'deactivate']);
  }

  // ── Membres ──────────────────────────────────────────────────────
  members(organization: string, includeEnded = false): Observable<MembershipView[]> {
    return this.api.get<MembershipView[]>(['organizations', organization, 'members'], { include_ended: includeEnded ? 1 : null });
  }

  addMember(organization: string, data: NewMember): Observable<MembershipView> {
    return this.api.post<MembershipView>(['organizations', organization, 'members'], data);
  }

  updateMembership(uuid: string, data: Partial<Pick<NewMember, 'role' | 'matricule' | 'position' | 'is_primary'>>): Observable<MembershipView> {
    return this.api.patch<MembershipView>(['memberships', uuid], data);
  }

  endMembership(uuid: string): Observable<MembershipView> {
    return this.api.post<MembershipView>(['memberships', uuid, 'end']);
  }

  // ── Suivi des envois (SMS, emails) ───────────────────────────────
  deliveries(query: { status?: string; channel?: string; event?: string; from?: string; to?: string; page?: number } = {}): Observable<LaravelPage<NotificationDelivery>> {
    return this.api.get<LaravelPage<NotificationDelivery>>(['notification-deliveries'], query);
  }

  deliveriesSummary(days = 30): Observable<DeliveriesSummary> {
    return this.api.get<DeliveriesSummary>(['notification-deliveries', 'summary'], { days });
  }

  retryDelivery(uuid: string): Observable<{ uuid: string; status: string }> {
    return this.api.post(['notification-deliveries', uuid, 'retry']);
  }
}

/** Lien renvoyé par l'API dans un message (« collections/<uuid> »…) → adresse de l'espace structure. */
export function inboxRoute(link: string | null | undefined): string | null {
  if (!link) {
    return null;
  }
  const [kind, uuid] = link.replace(/^\/+/, '').split('/');
  const base: Record<string, string> = {
    collections: 'retraits',
    matches: 'correspondances',
    reports: 'rapports',
    declarations: 'declarations',
    'found-documents': 'documents',
    documents: 'documents',
    restitutions: 'restitutions',
    vigilance: 'vigilance',
  };
  const target = base[kind];
  if (!target) {
    return null;
  }
  return uuid ? `/espace/${target}/${uuid}` : `/espace/${target}`;
}
