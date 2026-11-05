/**
 * Réponses des routes V2 du guichet, telles que renvoyées par les ressources Laravel
 * (app/Http/Resources/V2). Plus précises que la spec OpenAPI sur certains points (ex. phone_masked).
 */

export interface OrgRef {
  uuid: string;
  name: string;
}

/** Liste paginée Laravel (->paginate()). */
export interface LaravelPage<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface CitizenProfile {
  uuid: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  phone_masked: string | null;
  has_account: boolean;
  /** none : pas de compte ; pending : compte créé au guichet, mot de passe pas encore choisi ; active. */
  account_status?: 'none' | 'pending' | 'active';
  email_masked?: string | null;
}

export interface CounterDeclarationItem {
  uuid: string;
  document_type: { id: number; name: string | null };
  first_name: string;
  last_name: string;
  birth_date: string | null;
  doc_number: string | null;
  status: 'lost' | 'found' | 'restituted' | string;
}

export interface ChargeShortView {
  uuid: string;
  reference: string;
  status: string;
  amount: number;
  list_amount: number;
  currency: string;
}

export interface CounterDeclaration {
  uuid: string;
  reference: string;
  channel: 'online' | 'counter' | string;
  status: string;
  lost_at: string | null;
  lost_place: string | null;
  circumstances?: string | null;
  territory?: { code: string; name: string } | null;
  citizen?: CitizenProfile | null;
  organization?: OrgRef | null;
  recorded_by?: { uuid: string; name: string } | null;
  /** Déclaration faite en ligne puis certifiée au guichet. */
  certified?: {
    at: string;
    by?: { uuid: string; name: string } | null;
    person?: { first_name: string; last_name: string; birth_date: string | null; id_type: string | null; id_last4: string | null };
  } | null;
  receipt?: { number: string; created_at: string } | null;
  items?: CounterDeclarationItem[];
  certificate: {
    number: string;
    kind: 'official' | 'receipt' | string;
    verification_code: string;
    verification_url: string;
    revoked_at: string | null;
    pdf_url: string | null;
  } | null;
  charge?: ChargeShortView | null;
  closed_at: string | null;
  closure_reason: string | null;
  created_at: string;
}

/** Résumé d'une déclaration en ligne avant vérification d'identité (GET /api/v2/online-declarations/lookup). */
export interface OnlineDeclarationLookup {
  uuid: string;
  reference: string;
  declared_at: string | null;
  status: string;
  document_types: string[];
  holder_initials: string;
  has_doc_number: boolean;
  lost_at: string | null;
  lost_place: string | null;
  can_certify: boolean;
  certified: { date: string | null; structure: string | null } | null;
}

/** Corps de POST /api/v2/online-declarations/{uuid}/certify. */
export interface CertifyOnlinePayload {
  /** Pièce présentée facultative : la victime peut avoir tout perdu (id_type et id_number à null). */
  person: { first_name: string; last_name: string; birth_date?: string | null; id_type: IdType | null; id_number: string | null };
  checks: { identity_photo_matches: boolean };
  name_override_reason?: string | null;
  lost_at?: string | null;
  lost_place?: string | null;
  territory_code?: string | null;
  circumstances?: string | null;
  doc_number?: string | null;
}

export interface FoundDocumentView {
  uuid: string;
  reference: string;
  found_channel: 'citizen' | 'counter' | 'qr_scan' | string;
  lifecycle_status: string;
  document_type: { id: number; name: string | null };
  first_name: string;
  last_name: string;
  birth_date: string | null;
  doc_number: string | null;
  found_at: string | null;
  found_place: string | null;
  custody: { organization: OrgRef; since: string | null; deposited_by: string | null } | null;
  finder?: CitizenProfile | null;
  image_url: string | null;
  matches?: { uuid: string; score: number; status: string }[];
  created_at: string;
}

export interface ScoreCriterion {
  result?: string;
  points?: number;
  max?: number;
  [key: string]: unknown;
}

export interface MatchView {
  uuid: string;
  status: string;
  score: number;
  number_match: boolean;
  engine: string;
  score_details: Record<string, ScoreCriterion> | null;
  organization: OrgRef | null;
  lost_item: {
    declaration_reference: string | null;
    declaration_channel: string | null;
    declared_at: string | null;
    declared_by_structure: string | null;
    document_type: string | null;
    first_name: string;
    last_name: string;
    birth_date: string | null;
    doc_number_last4: string | null;
    lost_at: string | null;
    lost_place: string | null;
  } | null;
  found_document: {
    reference: string;
    uuid: string;
    document_type: string | null;
    first_name: string;
    last_name: string;
    birth_date: string | null;
    doc_number_last4: string | null;
    found_at: string | null;
    found_place: string | null;
    custody: string | null;
    lifecycle_status: string | null;
  } | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface CollectionView {
  uuid: string;
  status: string;
  priority: boolean;
  owner_identified_at: string | null;
  organization: OrgRef | null;
  assigned_at: string | null;
  assignment_reason: 'gps' | 'department' | 'region' | 'transfer' | string | null;
  distance_km: number | null;
  document: {
    uuid: string;
    reference: string;
    document_type: string | null;
    first_name: string;
    last_name: string;
    found_place: string | null;
    latitude: number | null;
    longitude: number | null;
    territory: string | null;
    published_at: string;
    image_url: string | null;
  } | null;
  finder: { name: string | null; phone: string | null };
  contact_attempts: number;
  last_contact_at: string | null;
  last_contact_outcome: 'reached' | 'no_answer' | 'wrong_number' | null;
  method: 'drop_off' | 'agent_pickup' | null;
  scheduled_at: string | null;
  meeting_place: string | null;
  pickup_agent: { uuid: string; name: string } | null;
  collected_at: string | null;
  closed_reason: string | null;
  history?: { from: string | null; to: string; reason: string | null; at: string }[];
  created_at: string;
}

export interface RestitutionPreparation {
  document: {
    uuid: string;
    reference: string;
    document_type: string | null;
    owner_first_name: string;
    owner_last_name: string;
    birth_date: string | null;
    doc_number_last4: string | null;
    lifecycle_status: string;
  };
  confirmed_match: { uuid: string; declaration_reference: string | null; declared_by: string | null } | null;
  proxy_allowed: boolean;
  requirements: string[];
  can_restitute: boolean;
  blocking_reason: string | null;
}

export type IdType = 'cni' | 'passeport' | 'permis' | 'carte_consulaire' | 'carte_militaire' | 'extrait_naissance' | 'autre';

export const ID_TYPE_LABELS: Record<IdType, string> = {
  cni: "Carte d'identité (CEDEAO)",
  passeport: 'Passeport',
  permis: 'Permis de conduire',
  carte_consulaire: 'Carte consulaire',
  carte_militaire: 'Carte militaire',
  extrait_naissance: 'Extrait de naissance',
  autre: 'Autre pièce',
};

export interface RestitutionPayload {
  recipient_type: 'owner' | 'proxy';
  owner: {
    first_name: string;
    last_name: string;
    birth_date?: string | null;
    id_type?: IdType | null;
    id_number?: string | null;
    phone?: string | null;
    ocr_scan_id?: string | null;
  };
  proxy?: {
    first_name: string;
    last_name: string;
    id_type?: IdType | null;
    id_number?: string | null;
    phone?: string | null;
    relationship?: string | null;
    power_of_attorney_ref?: string | null;
    ocr_scan_id?: string | null;
  };
  checks: { identity_photo_matches: boolean; power_of_attorney_verified?: boolean };
  name_override_reason?: string | null;
  vigilance_override_reason?: string | null;
}

export interface RestitutionView {
  uuid: string;
  reference: string;
  status: 'completed' | 'voided' | string;
  handed_over_at: string;
  organization: OrgRef;
  agent: string | null;
  document: { uuid: string; reference: string; document_type: string | null; owner_name: string; lifecycle_status: string } | null;
  recipient_type: 'owner' | 'proxy';
  owner: { name: string; id_type: string | null; id_last4: string | null };
  proxy: { name: string; id_type: string | null; id_last4: string | null; relationship: string | null; power_of_attorney_ref: string | null } | null;
  checks: Record<string, unknown> | null;
  name_similarity: number | null;
  name_override: string | null;
  verification_code: string;
  verification_url: string;
  discharge_url: string;
  signed_scan: boolean;
}

export interface CounterCharge extends ChargeShortView {
  service: { code: string | null; name: string | null };
  organization: OrgRef | null;
  paid_with: string | null;
  settled_at: string | null;
  exemption_reason: string | null;
  created_at: string;
  change_due?: number;
}
