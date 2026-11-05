import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiV2Client } from './api-v2.client';
import { OcrScan, QueryParams } from './api.types';
import {
  CitizenProfile,
  CollectionView,
  CounterCharge,
  CertifyOnlinePayload,
  CounterDeclaration,
  FoundDocumentView,
  LaravelPage,
  MatchView,
  OnlineDeclarationLookup,
  OrgRef,
  RestitutionPayload,
  RestitutionPreparation,
  RestitutionView,
} from './counter.types';

export interface NewCounterDeclaration {
  citizen_profile_uuid?: string | null;
  citizen?: { first_name: string; last_name: string; birth_date?: string | null; phone: string; email?: string | null };
  lost_at?: string | null;
  lost_place?: string | null;
  territory_code?: string | null;
  circumstances?: string | null;
  items: { document_type_id: number; first_name: string; last_name: string; birth_date?: string | null; doc_number?: string | null }[];
}

/**
 * Routes V2 du guichet (agents, responsables). La structure active est envoyée
 * automatiquement (en-tête X-Organization) par l'intercepteur.
 */
@Injectable({ providedIn: 'root' })
export class CounterApi {
  private readonly api = inject(ApiV2Client);

  // ── Citoyens ─────────────────────────────────────────────────────
  searchCitizens(query: { phone?: string; last_name?: string; first_name?: string; birth_date?: string }): Observable<CitizenProfile[]> {
    return this.api.get<CitizenProfile[]>(['citizens'], query);
  }

  /** Créer le compte DocTrack d'une personne enregistrée (email), ou renvoyer son lien d'activation. */
  citizenAccount(uuid: string, email?: string | null): Observable<CitizenProfile> {
    return this.api.post<CitizenProfile>(['citizens', uuid, 'account'], email ? { email } : {});
  }

  createCitizen(data: { first_name: string; last_name: string; birth_date?: string | null; phone: string; email?: string | null }): Observable<CitizenProfile> {
    return this.api.post<CitizenProfile>(['citizens'], data);
  }

  // ── Déclarations au guichet ──────────────────────────────────────
  declarations(query: QueryParams = {}): Observable<LaravelPage<CounterDeclaration>> {
    return this.api.get<LaravelPage<CounterDeclaration>>(['declarations'], query);
  }

  declaration(uuid: string): Observable<CounterDeclaration> {
    return this.api.get<CounterDeclaration>(['declarations', uuid]);
  }

  declare(data: NewCounterDeclaration): Observable<CounterDeclaration> {
    return this.api.post<CounterDeclaration>(['declarations'], data);
  }

  cancelDeclaration(uuid: string, reason: string): Observable<CounterDeclaration> {
    return this.api.post<CounterDeclaration>(['declarations', uuid, 'cancel'], { reason });
  }

  certificatePdf(uuid: string): Observable<Blob> {
    return this.api.blob(['declarations', uuid, 'certificate']);
  }

  // ── Déclarations faites en ligne : certification au guichet ──────
  /** Retrouver une déclaration en ligne par sa référence (DT-…) ou le code / lien du QR de son récépissé. */
  lookupOnlineDeclaration(q: string): Observable<OnlineDeclarationLookup> {
    return this.api.get<OnlineDeclarationLookup>(['online-declarations', 'lookup'], { q });
  }

  /** Vérifier l'identité, rattacher la déclaration à la structure et délivrer le certificat de perte. */
  certifyOnlineDeclaration(uuid: string, data: CertifyOnlinePayload): Observable<CounterDeclaration> {
    return this.api.post<CounterDeclaration>(['online-declarations', uuid, 'certify'], data);
  }

  // ── Documents trouvés (déposés au guichet ou pris en garde) ──────
  foundDocuments(query: QueryParams = {}): Observable<LaravelPage<FoundDocumentView>> {
    return this.api.get<LaravelPage<FoundDocumentView>>(['found-documents'], query);
  }

  foundDocument(uuid: string): Observable<FoundDocumentView> {
    return this.api.get<FoundDocumentView>(['found-documents', uuid]);
  }

  deposit(form: FormData): Observable<FoundDocumentView> {
    return this.api.post<FoundDocumentView>(['found-documents'], form);
  }

  /** Suppression définitive (sans corbeille) d'un document enregistré au guichet. */
  deleteFoundDocument(uuid: string): Observable<{ success: boolean; message: string }> {
    return this.api.delete<{ success: boolean; message: string }>(['found-documents', uuid]);
  }

  takeCustody(uuid: string): Observable<FoundDocumentView> {
    return this.api.post<FoundDocumentView>(['found-documents', uuid, 'take-custody']);
  }

  /** Lecture OCR d'une pièce : document trouvé, ou pièce d'identité présentée à la restitution. */
  scan(image: Blob, purpose: 'found_document' | 'identity_check'): Observable<OcrScan> {
    const form = new FormData();
    form.append('image', image, 'piece.jpg');
    form.append('purpose', purpose);
    return this.api.post<OcrScan>(['ocr', 'scan'], form);
  }

  // ── Correspondances ──────────────────────────────────────────────
  matches(status = 'pending_review', page = 1): Observable<LaravelPage<MatchView>> {
    return this.api.get<LaravelPage<MatchView>>(['matches'], { status, page });
  }

  match(uuid: string): Observable<MatchView> {
    return this.api.get<MatchView>(['matches', uuid]);
  }

  confirmMatch(uuid: string, note?: string | null): Observable<MatchView> {
    return this.api.post<MatchView>(['matches', uuid, 'confirm'], { note: note || null });
  }

  rejectMatch(uuid: string, reason: string): Observable<MatchView> {
    return this.api.post<MatchView>(['matches', uuid, 'reject'], { reason });
  }

  // ── Retraits auprès des trouveurs ────────────────────────────────
  collections(status?: string, page = 1): Observable<LaravelPage<CollectionView>> {
    return this.api.get<LaravelPage<CollectionView>>(['collections'], { status, page });
  }

  collection(uuid: string): Observable<CollectionView> {
    return this.api.get<CollectionView>(['collections', uuid]);
  }

  recordContact(uuid: string, outcome: 'reached' | 'no_answer' | 'wrong_number', note?: string | null): Observable<CollectionView> {
    return this.api.post<CollectionView>(['collections', uuid, 'contact'], { outcome, note: note || null });
  }

  planCollection(uuid: string, data: { method: 'drop_off' | 'agent_pickup'; scheduled_at?: string | null; meeting_place?: string | null }): Observable<CollectionView> {
    return this.api.post<CollectionView>(['collections', uuid, 'plan'], data);
  }

  markCollected(uuid: string): Observable<CollectionView> {
    return this.api.post<CollectionView>(['collections', uuid, 'collected']);
  }

  transferCollection(uuid: string, organization_uuid: string, reason: string): Observable<CollectionView> {
    return this.api.post<CollectionView>(['collections', uuid, 'transfer'], { organization_uuid, reason });
  }

  declineCollection(uuid: string, reason: string): Observable<CollectionView> {
    return this.api.post<CollectionView>(['collections', uuid, 'decline'], { reason });
  }

  cancelCollection(uuid: string, reason: string): Observable<CollectionView> {
    return this.api.post<CollectionView>(['collections', uuid, 'cancel'], { reason });
  }

  /** Structures actives visibles (choix d'une structure de transfert). */
  organizations(q?: string): Observable<{ data: (OrgRef & { type?: { name?: string } })[] }> {
    return this.api.get<{ data: (OrgRef & { type?: { name?: string } })[] }>(['organizations'], { q, level: 'structure' });
  }

  // ── Restitution officielle ───────────────────────────────────────
  prepareRestitution(documentUuid: string): Observable<RestitutionPreparation> {
    return this.api.get<RestitutionPreparation>(['found-documents', documentUuid, 'restitution']);
  }

  restitute(documentUuid: string, data: RestitutionPayload): Observable<RestitutionView> {
    return this.api.post<RestitutionView>(['found-documents', documentUuid, 'restitution'], data);
  }

  restitutions(query: QueryParams = {}): Observable<LaravelPage<RestitutionView>> {
    return this.api.get<LaravelPage<RestitutionView>>(['restitutions'], query);
  }

  restitution(uuid: string): Observable<RestitutionView> {
    return this.api.get<RestitutionView>(['restitutions', uuid]);
  }

  dischargePdf(uuid: string): Observable<Blob> {
    return this.api.blob(['restitutions', uuid, 'discharge']);
  }

  attachSignedScan(uuid: string, file: Blob, name = 'decharge-signee.jpg'): Observable<RestitutionView> {
    const form = new FormData();
    form.append('file', file, name);
    return this.api.post<RestitutionView>(['restitutions', uuid, 'signed-scan'], form);
  }

  voidRestitution(uuid: string, reason: string): Observable<RestitutionView> {
    return this.api.post<RestitutionView>(['restitutions', uuid, 'void'], { reason });
  }

  // ── Frais ────────────────────────────────────────────────────────
  charges(status?: string, page = 1): Observable<LaravelPage<CounterCharge>> {
    return this.api.get<LaravelPage<CounterCharge>>(['charges'], { status, page });
  }

  payCash(uuid: string, amount_received?: number | null): Observable<CounterCharge> {
    return this.api.post<CounterCharge>(['charges', uuid, 'cash'], { amount_received: amount_received ?? null });
  }

  exemptCharge(uuid: string, reason: string): Observable<CounterCharge> {
    return this.api.post<CounterCharge>(['charges', uuid, 'exempt'], { reason });
  }

  cancelCharge(uuid: string, reason: string): Observable<CounterCharge> {
    return this.api.post<CounterCharge>(['charges', uuid, 'cancel'], { reason });
  }

  waveCheckout(uuid: string, payer_phone?: string | null): Observable<{ payment: string; checkout_url: string }> {
    return this.api.post<{ payment: string; checkout_url: string }>(['charges', uuid, 'checkout'], { payer_phone: payer_phone || null });
  }
}
