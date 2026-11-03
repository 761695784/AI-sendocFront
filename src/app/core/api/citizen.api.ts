import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { apiV1, apiV2 } from '../http/api-url';
import { OcrScan } from './api.types';
import {
  ChargeView,
  CollectionSummary,
  DocTypeRef,
  DeclareLossPayload,
  DeclareLossResponse,
  DocumentTagView,
  MyDeclaration,
  PublicTagView,
  PublishedDocument,
  RestitutionRequestView,
  TagFoundAnswer,
  Territory,
  VerificationView,
} from './citizen.types';

/** Réponse de POST /api/documents. */
export interface PublishResponse {
  success: boolean;
  message: string;
  document: PublishedDocument;
  collection: CollectionSummary | null;
}

/** Réponse de POST /api/documents/{uuid}/restitution (succès ou refus expliqué). */
export interface RestitutionAskResponse {
  success: boolean;
  message: string;
  code?: string;
  custody?: { uuid: string; name: string; address: string | null; phone: string | null } | null;
  request?: { uuid: string; status: string; expires_at: string | null };
}

/**
 * Appels de l'API pour l'espace citoyen, le trouveur et les pages publiques.
 * Le jeton est ajouté par l'intercepteur.
 */
@Injectable({ providedIn: 'root' })
export class CitizenApi {
  private readonly http = inject(HttpClient);

  private documentTypes$?: Observable<DocTypeRef[]>;
  private departments$?: Observable<Territory[]>;

  // ── Référentiels (mis en cache pour la session) ──────────────────

  documentTypes(): Observable<DocTypeRef[]> {
    this.documentTypes$ ??= this.http
      .get<DocTypeRef[] | { data: DocTypeRef[] }>(apiV1('document-types'))
      .pipe(
        map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
        shareReplay(1),
      );
    return this.documentTypes$;
  }

  departments(): Observable<Territory[]> {
    this.departments$ ??= this.http
      .get<Territory[]>(apiV2('territories'), { params: { level: 'department' } })
      .pipe(shareReplay(1));
    return this.departments$;
  }

  // ── Déclarations et documents retrouvés ──────────────────────────

  /** Déclaration en ligne : enregistre la perte et délivre un récépissé DocTrack (pas un certificat de perte). */
  declareLoss(payload: DeclareLossPayload): Observable<DeclareLossResponse> {
    return this.http.post<DeclareLossResponse>(apiV1('declarations'), payload);
  }

  /** PDF d'un récépissé ou d'un certificat de perte appartenant au citoyen. */
  certificatePdf(uuid: string): Observable<Blob> {
    return this.http.get(apiV1('certificats', uuid, 'voir'), { responseType: 'blob' });
  }

  myDeclarations(): Observable<MyDeclaration[]> {
    return this.http
      .get<{ data: MyDeclaration[] }>(apiV1('my-declarations'))
      .pipe(map((res) => (res?.data ?? []).map((d) => ({ ...d, found_documents: d.found_documents ?? [] }))));
  }

  /** Le propriétaire confirmé demande la remise directe au trouveur. */
  askRestitution(documentUuid: string): Observable<RestitutionAskResponse> {
    return this.http.post<RestitutionAskResponse>(apiV1('documents', documentUuid, 'restitution'), {});
  }

  // ── Remises directes (propriétaire ↔ trouveur) ───────────────────

  restitutionRequests(): Observable<RestitutionRequestView[]> {
    return this.http.get<{ data: RestitutionRequestView[] }>(apiV1('restitution-requests')).pipe(map((r) => r.data ?? []));
  }

  acceptRestitution(uuid: string): Observable<{ message: string; request: RestitutionRequestView }> {
    return this.http.post<{ message: string; request: RestitutionRequestView }>(apiV1('restitution-requests', uuid, 'accept'), {});
  }

  declineRestitution(uuid: string, reason?: string): Observable<{ message: string; request: RestitutionRequestView }> {
    return this.http.post<{ message: string; request: RestitutionRequestView }>(
      apiV1('restitution-requests', uuid, 'decline'),
      { reason: reason || null },
    );
  }

  cancelRestitution(uuid: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(apiV1('restitution-requests', uuid, 'cancel'), {});
  }

  // ── Documents publiés par le trouveur ────────────────────────────

  myPublications(page = 1): Observable<{ data: PublishedDocument[]; meta?: { current_page: number; last_page: number; total: number } }> {
    return this.http.get<{ data: PublishedDocument[]; meta?: { current_page: number; last_page: number; total: number } }>(
      apiV1('my-publications'),
      { params: { page } },
    );
  }

  collectionOf(documentUuid: string): Observable<CollectionSummary | null> {
    return this.http
      .get<{ collection: CollectionSummary | null }>(apiV1('documents', documentUuid, 'collection'))
      .pipe(map((r) => r.collection));
  }

  /** Lecture automatique de la pièce photographiée (le formulaire est pré-rempli). */
  scan(image: Blob, purpose: 'found_document' | 'identity_check' = 'found_document'): Observable<OcrScan> {
    const form = new FormData();
    form.append('image', image, 'piece.jpg');
    form.append('purpose', purpose);
    return this.http.post<OcrScan>(apiV2('ocr', 'scan'), form);
  }

  publish(form: FormData): Observable<PublishResponse> {
    return this.http.post<PublishResponse>(apiV1('documents'), form);
  }

  // ── QR codes des documents ───────────────────────────────────────

  tags(): Observable<DocumentTagView[]> {
    return this.http.get<{ data: DocumentTagView[] }>(apiV1('document-tags')).pipe(map((r) => r.data ?? []));
  }

  tag(uuid: string): Observable<DocumentTagView> {
    return this.http.get<DocumentTagView>(apiV1('document-tags', uuid));
  }

  createTag(data: { document_type_id: number; label?: string | null; doc_number?: string | null }): Observable<DocumentTagView> {
    return this.http.post<DocumentTagView>(apiV1('document-tags'), data);
  }

  /** Renouvellement : 201 (actif) ou 402 (paiement requis, charge fournie dans l'erreur). */
  renewTag(uuid: string): Observable<{ tag: DocumentTagView; payment_required: boolean; charge: ChargeView }> {
    return this.http.post<{ tag: DocumentTagView; payment_required: boolean; charge: ChargeView }>(
      apiV1('document-tags', uuid, 'renew'),
      {},
    );
  }

  revokeTag(uuid: string): Observable<DocumentTagView> {
    return this.http.post<DocumentTagView>(apiV1('document-tags', uuid, 'revoke'), {});
  }

  // ── Paiements ────────────────────────────────────────────────────

  myCharges(): Observable<ChargeView[]> {
    return this.http.get<{ data: ChargeView[] }>(apiV1('my-charges')).pipe(map((r) => r.data ?? []));
  }

  checkout(chargeUuid: string): Observable<{ payment: string; checkout_url: string; charge: ChargeView }> {
    return this.http.post<{ payment: string; checkout_url: string; charge: ChargeView }>(apiV1('charges', chargeUuid, 'checkout'), {});
  }

  // ── Pages publiques (sans compte) ────────────────────────────────

  publicTag(token: string): Observable<PublicTagView> {
    return this.http.get<PublicTagView>(apiV2('tags', token));
  }

  reportTagFound(
    token: string,
    data: {
      finder_phone: string;
      finder_name?: string | null;
      place?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      allow_owner_contact: boolean;
      contact_consent: boolean;
    },
  ): Observable<TagFoundAnswer> {
    return this.http.post<TagFoundAnswer>(apiV2('tags', token, 'found'), data);
  }

  verify(code: string): Observable<VerificationView> {
    return this.http.get<VerificationView>(apiV2('verify', code.trim()));
  }
}
