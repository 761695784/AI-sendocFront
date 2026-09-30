import { OrgRef } from './counter.types';

/** Types des écrans de pilotage (boîte de réception, statistiques, vigilance, rapports, membres, structures). */

// ── Boîte de réception ───────────────────────────────────────────
export interface InboxMessage {
  uuid: string;
  event: string;
  title: string;
  body: string | null;
  /** Lien relatif renvoyé par l'API, ex. « collections/<uuid> », « matches/<uuid> », « reports/<uuid> ». */
  link: string | null;
  priority: boolean;
  is_read: boolean;
  organization: OrgRef | null;
  created_at: string;
}

// ── Statistiques ─────────────────────────────────────────────────
export interface StatsScope {
  level: string;
  organization: OrgRef | null;
  structures?: number;
}

export interface Sla {
  first_contact_hours: number;
  escalate_hours: number;
  collection_hours: number;
  review_hours: number;
}

export interface StatsOverview {
  scope: StatsScope;
  period: { from: string; to: string };
  declarations: { counter: number; cancelled: number; online: number | null };
  found_documents: {
    deposited_at_counter: number;
    collected_from_finders: number;
    published_online: number | null;
    in_custody_now: number;
    custody_age: { under_30_days: number; '30_to_90_days': number; over_90_days: number };
    entered_custody: number;
    restitution_rate_pct: number | null;
  };
  matches: {
    created: number;
    auto_confirmed: number;
    confirmed_by_agents: number;
    rejected: number;
    pending_review_now: number;
    overdue_reviews_now: number;
    median_review_hours: number | null;
  };
  collections: {
    assigned: number;
    median_first_contact_hours: number | null;
    contacted_within_sla_pct: number | null;
    collected: number;
    median_hours_to_collect: number | null;
    cancelled: number;
    open_now: number;
    overdue_now: number;
    unassigned_now?: number;
  };
  restitutions: {
    completed: number;
    voided: number;
    by_proxy: number;
    without_prior_declaration: number;
    name_derogations: number;
    median_days_in_custody: number | null;
  };
  sms: { sent: number; failed: number; skipped: number };
  sla: Sla;
}

export interface StructureRow {
  uuid: string;
  name: string;
  parent: string | null;
  is_active: boolean;
  collections_assigned: number;
  median_first_contact_hours: number | null;
  contacted_within_sla_pct: number | null;
  collections_overdue_now: number;
  collected: number;
  median_hours_to_collect: number | null;
  in_custody_now: number;
  pending_reviews_now: number;
  counter_declarations: number;
  restitutions: number;
}

export interface StructuresStats {
  scope: StatsScope;
  period: { from: string; to: string };
  sla: Sla;
  data: StructureRow[];
}

export type TimeseriesMetric =
  | 'counter_declarations'
  | 'deposits'
  | 'collections_assigned'
  | 'collected'
  | 'matches_confirmed'
  | 'restitutions';

export const METRIC_LABELS: Record<TimeseriesMetric, string> = {
  counter_declarations: 'Déclarations au guichet',
  deposits: 'Dépôts de documents trouvés',
  collections_assigned: 'Retraits attribués',
  collected: 'Documents récupérés chez les trouveurs',
  matches_confirmed: 'Correspondances confirmées',
  restitutions: 'Restitutions',
};

export interface Timeseries {
  scope: StatsScope;
  metric: TimeseriesMetric;
  interval: 'day' | 'week' | 'month';
  points: { period: string; value: number }[];
}

export interface OverdueCollection {
  uuid: string;
  structure: OrgRef | null;
  reference: string | null;
  document_type: string | null;
  place: string | null;
  assigned_at: string;
  hours_waiting: number;
  priority: boolean;
  escalated: boolean;
}

export interface OverdueCollections {
  scope: StatsScope;
  first_contact_hours: number;
  data: OverdueCollection[];
}

// ── Vigilance ────────────────────────────────────────────────────
export type AlertLevel = 'info' | 'warning' | 'high';
export type AlertStatus = 'open' | 'confirmed' | 'dismissed';

export const ALERT_LEVELS: Record<AlertLevel, { label: string; tone: 'info' | 'warning' | 'danger'; icon: string }> = {
  high: { label: 'Haute', tone: 'danger', icon: 'fa-exclamation-circle' },
  warning: { label: 'Moyenne', tone: 'warning', icon: 'fa-exclamation-triangle' },
  info: { label: 'Information', tone: 'info', icon: 'fa-info-circle' },
};

export interface VigilanceAlert {
  uuid: string;
  kind: string;
  label: string;
  level: AlertLevel;
  status: AlertStatus;
  message: string | null;
  details: Record<string, unknown>;
  subject: { type: string; uuid: string | null; reference: string | null };
  organization: OrgRef | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface VigilanceList {
  data: VigilanceAlert[];
  summary: Partial<Record<AlertLevel, number>>;
  meta: { current_page: number; last_page: number; total: number };
}

// ── Rapports ─────────────────────────────────────────────────────
export interface ReportNarrative {
  summary_fr?: string;
  summary_en?: string;
  highlights?: string[];
  structures?: { name: string; comment: string }[];
  recommendations?: { priority: 'haute' | 'moyenne' | 'basse'; text: string }[];
  provider?: string;
  model?: string;
  verified?: boolean;
  edited_by_reviewer?: boolean;
}

export interface ReportAnalysis {
  score: number;
  level: string;
  summary: string;
  alerts: { severity: string; message: string }[];
  positives: string[];
  recommendations: string[];
}

export interface ActivityReport {
  uuid: string;
  reference: string;
  title: string;
  scope: OrgRef | 'national';
  period: { from: string; to: string; label: string };
  level: string | null;
  score: number | null;
  alerts_count: number;
  automatic: boolean;
  pdf_url: string;
  xlsx_url: string;
  created_at: string;
  delivered_at: string | null;
  narrative_status: string | null;
  // Détail (GET /reports/{uuid})
  analysis?: ReportAnalysis;
  narrative?: ReportNarrative | null;
  narrative_review?: { reviewed_at: string | null; note: string | null; attempts: number | null };
}

// ── Structures et membres ────────────────────────────────────────
export type OrgLevel = 'institution' | 'intermediate' | 'structure';

export const LEVEL_LABELS: Record<string, string> = { institution: 'Institution', intermediate: 'Direction / échelon intermédiaire', structure: 'Structure (guichet)' };

export interface OrganizationType {
  code: string;
  name: string;
  level: OrgLevel;
}

export interface Territory {
  code: string;
  name: string;
  level: string;
  parent?: { code: string; name: string } | null;
}

export interface Organization {
  uuid: string;
  name: string;
  code: string | null;
  type?: OrganizationType;
  parent?: OrgRef | null;
  territory?: { code: string; name: string; level: string } | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  accepts_collections: boolean;
  depth: number;
  is_active: boolean;
  children_count?: number;
  members_count?: number;
  my_role: string | null;
  can: { update: boolean; create_child: boolean; manage_members: boolean } | null;
}

export interface OrganizationPayload {
  organization_type?: string;
  parent_uuid?: string | null;
  name?: string;
  code?: string | null;
  territory_code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accepts_collections?: boolean;
}

export type MemberRole = 'institution_admin' | 'structure_manager' | 'agent';

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super administrateur',
  institution_admin: 'Administrateur d’institution',
  structure_manager: 'Responsable de structure',
  agent: 'Agent',
};

export interface MembershipView {
  uuid: string;
  role: MemberRole;
  matricule: string | null;
  position: string | null;
  is_primary: boolean;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  user?: {
    uuid: string;
    FirstName: string;
    LastName: string;
    email: string;
    Phone: string | null;
    status: string;
    last_login_at: string | null;
  };
  organization?: OrgRef;
  invitation_sent?: boolean;
}

export interface NewMember {
  email: string;
  FirstName: string;
  LastName: string;
  Phone: string;
  role: MemberRole;
  matricule?: string | null;
  position?: string | null;
  is_primary?: boolean;
}

/** Liste paginée d'une ressource Laravel (->paginate() dans une Resource::collection). */
export interface ResourcePage<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

// ── Suivi des envois ─────────────────────────────────────────────
export interface NotificationDelivery {
  uuid: string;
  event: string;
  channel: 'sms' | 'email' | 'inbox';
  destination: string | null;
  status: string;
  attempts: number;
  error: string | null;
  preview: string | null;
  subject: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface DeliveriesSummary {
  days: number;
  by_channel: Record<string, Record<string, number>>;
  top_events: Record<string, number>;
  sms_sent: number;
  sms_failed: number;
  sms_fail_rate: number;
}
