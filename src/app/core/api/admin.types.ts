import { OrgRef } from './counter.types';
import { ReportNarrative } from './pilot.types';

/** Types de l'espace super admin : types de structure, synthèses IA, tarifs et reversements. */

export interface NarrativeEdits {
  summary_fr?: string;
  summary_en?: string;
  highlights?: string[];
  recommendations?: { priority: 'haute' | 'moyenne' | 'basse'; text: string }[];
  structures?: { name: string; comment: string }[];
  note?: string;
}

export interface NarrativeAttempt {
  provider: string;
  model?: string;
  ok: boolean;
  error?: string;
}

export type { ReportNarrative };

// ── Facturation ─────────────────────────────────────────────────
export interface PriceRule {
  id: number;
  amount: number;
  currency: string;
  authority_share_pct: number;
  institution: OrgRef | null;
  valid_from: string | null;
  valid_to: string | null;
  note: string | null;
}

export interface BillableService {
  code: string;
  name: string;
  description: string | null;
  current: PriceRule;
  history: PriceRule[];
}

export interface BillingServices {
  mode: 'pilot' | 'live';
  data: BillableService[];
}

export interface NewPrice {
  service: string;
  amount: number;
  authority_share_pct: number;
  institution_uuid?: string | null;
  valid_from?: string | null;
  note?: string | null;
}

export interface BillingTotals {
  count: number;
  collected: number;
  authority_share: number;
  platform_share: number;
  paid_count: number;
  exempted_count: number;
  exempted_value: number;
  pilot_count: number;
  pilot_theoretical_value: number;
  pending_count: number;
  pending_amount: number;
}

export interface BillingReport {
  period: { from: string; to: string };
  mode: 'pilot' | 'live';
  totals: BillingTotals;
  by_service: (BillingTotals & { service: string; name: string })[];
  by_institution: (BillingTotals & { institution: string })[];
  scope: OrgRef | 'national';
}
