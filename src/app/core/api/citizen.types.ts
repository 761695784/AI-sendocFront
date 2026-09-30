/**
 * Réponses des routes utilisées par l'espace citoyen (API V1 enrichie + quelques routes V2).
 * Les routes V2 documentées dans la spec OpenAPI utilisent les types générés (api.types.ts).
 */

export interface DocTypeRef {
  id: number;
  TypeName: string;
}

/** Suite à donner pour un document retrouvé (voir GET /api/my-declarations). */
export type NextStep = 'counter' | 'direct' | 'wait' | 'done';

export interface OwnerFoundDocument {
  uuid: string;
  reference: string | null;
  document_type: string | null;
  lifecycle_status: string | null;
  found_channel: string | null;
  custody: { uuid: string; name: string; address: string | null; phone: string | null } | null;
  next_step: NextStep;
  restitution_request: { uuid: string; status: string; expires_at: string | null; active: boolean } | null;
}

/** Déclaration de perte du citoyen (GET /api/my-declarations). */
export interface MyDeclaration {
  id: number;
  uuid: string;
  reference: string | null;
  channel: 'online' | 'counter' | string;
  status: string;
  Title?: string | null;
  FirstNameInDoc: string;
  LastNameInDoc: string;
  DocIdentification?: string | null;
  document_type?: DocTypeRef | null;
  certificat?: { uuid: string; certificat_number?: string | null } | null;
  found_documents: OwnerFoundDocument[];
  created_at: string;
}

/** Demande de remise directe (GET /api/restitution-requests). */
export interface RestitutionRequestView {
  uuid: string;
  my_role: 'owner' | 'finder';
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'completed' | 'cancelled' | string;
  expires_at: string | null;
  responded_at: string | null;
  document: { uuid: string; reference: string | null; document_type: string | null; owner_name: string } | null;
  other_party: { first_name: string | null; phone: string | null };
  created_at: string;
}

/** Collecte d'un document publié par un trouveur (GET /api/documents/{uuid}/collection). */
export interface CollectionSummary {
  uuid: string;
  status: string;
  structure: { name: string; address: string | null; phone: string | null } | null;
  distance_km: number | null;
  method: 'drop_off' | 'agent_pickup' | string | null;
  scheduled_at: string | null;
  meeting_place: string | null;
  collected_at: string | null;
}

/** Document publié (DocumentResource). */
export interface PublishedDocument {
  id: number;
  uuid: string;
  reference: string | null;
  found_channel: string;
  lifecycle_status: string | null;
  custody: { uuid: string; name: string; address: string | null; phone: string | null } | null;
  OwnerFirstName: string;
  OwnerLastName: string;
  DocIdentification: string | null;
  Location: string;
  statut: string;
  document_type_id: number;
  document_type?: DocTypeRef | null;
  image: string | null;
  image_thumb: string | null;
  created_at: string;
  is_owner: boolean;
}

/** Étiquette QR d'un document (GET /api/document-tags). */
export interface DocumentTagView {
  uuid: string;
  status: 'active' | 'pending_payment' | 'revoked' | string;
  document_type: string | null;
  label: string | null;
  doc_number_last4: string | null;
  scans_count: number;
  last_scanned_at: string | null;
  activated_at: string | null;
  qr_svg: string | null;
  scan_url: string | null;
}

/** Frais (ChargeSummary). */
export interface ChargeView {
  uuid: string;
  reference: string;
  service: { code: string | null; name: string | null };
  status: string;
  amount: number;
  list_amount: number;
  currency: string;
  organization: { uuid: string; name: string } | null;
  paid_with: string | null;
  settled_at: string | null;
  exemption_reason: string | null;
  created_at: string;
}

/** Page publique d'un QR scanné (GET /api/v2/tags/{token}). */
export interface PublicTagView {
  valid: boolean;
  document_type?: string | null;
  message: string;
}

export interface TagFoundAnswer {
  success: boolean;
  duplicate: boolean;
  message: string;
  structure: { name: string; address: string | null; phone: string | null } | null;
}

/** Vérification publique d'un certificat ou d'une décharge (GET /api/v2/verify/{code}). */
export interface VerificationView {
  found: boolean;
  status: 'valid' | 'revoked' | 'unknown' | string;
  type?: 'certificate' | 'restitution';
  kind?: string;
  kind_label?: string;
  certificate_number?: string;
  issued_at?: string;
  issued_by?: { structure: string; institution: string } | null;
  document_types?: string[];
  holder_initials?: string | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
}

export interface Territory {
  code: string;
  name: string;
  level: string;
  parent?: { code: string; name: string } | null;
}
