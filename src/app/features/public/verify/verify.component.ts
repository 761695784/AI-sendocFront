import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { CitizenApi } from '../../../core/api/citizen.api';
import { VerificationView } from '../../../core/api/citizen.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { LoadingComponent } from '../../../shared/ui/state.components';

/**
 * Vérification publique d'un certificat de perte ou d'une décharge de restitution (/verifier/:code).
 * Pour une banque, une administration… : authentique ou révoqué, sans données personnelles (initiales seulement).
 */
@Component({
  selector: 'app-verify',
  imports: [TranslatePipe, FormsModule, NavbarComponent, FooterComponent, LoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <div class="dt-page">
      <section class="dt-hero">
        <div class="dt-hero__inner">
          <h1><i class="fas fa-certificate me-2" aria-hidden="true"></i>{{ 'verify.verifier_un_certificat' | t }}</h1>
          <p>{{ 'verify.certificat_de_perte_ou_decharge_de' | t }}</p>
        </div>
      </section>
      <div class="dt-container" style="max-width: 640px">
        <form class="dt-card dt-form d-flex flex-wrap gap-2 align-items-end" (ngSubmit)="search()">
          <div class="flex-grow-1">
            <label for="code">{{ 'verify.code_de_verification' | t }}</label>
            <input id="code" name="code" class="form-control dt-mono text-uppercase" [(ngModel)]="typed" [placeholder]="'verify.ex_cp_2026_000123' | t" autocomplete="off" />
          </div>
          <button type="submit" class="btn btn-dt" [disabled]="!typed.trim()">{{ 'verify.verifier' | t }}</button>
        </form>

        @if (loading()) {
          <app-loading [label]="'verify.verification' | t" />
        } @else if (result(); as r) {
          @if (!r.found) {
            <div class="dt-callout dt-callout--danger">
              <i class="fas fa-times-circle" aria-hidden="true"></i>
              <div><strong>{{ 'verify.code_inconnu' | t }}</strong> {{ 'verify.aucun_certificat_ne_correspond_a_ce' | t }}</div>
            </div>
          } @else {
            <div class="dt-card mt-3">
              <div class="d-flex align-items-center gap-3 mb-3">
                @if (r.status === 'valid') {
                  <i class="fas fa-check-circle" style="font-size: 2.5rem; color: var(--dt-success)" aria-hidden="true"></i>
                  <div><h2 class="h5 m-0" style="color: var(--dt-success)">{{ r.kind === 'receipt' ? ('verify.recepisse_authentique' | t) : ('verify.document_authentique' | t) }}</h2><small class="dt-muted">{{ r.kind_label }}</small></div>
                } @else {
                  <i class="fas fa-ban" style="font-size: 2.5rem; color: var(--dt-danger)" aria-hidden="true"></i>
                  <div><h2 class="h5 m-0" style="color: var(--dt-danger)">{{ 'verify.document_revoque' | t }}</h2><small class="dt-muted">{{ r.kind_label }}</small></div>
                }
              </div>
              <dl class="row mb-0">
                <dt class="col-sm-5">{{ 'verify.numero' | t }}</dt><dd class="col-sm-7 dt-mono">{{ r.certificate_number }}</dd>
                <dt class="col-sm-5">{{ 'verify.date' | t }}</dt><dd class="col-sm-7">{{ r.issued_at }}</dd>
                @if (r.issued_by) {
                  <dt class="col-sm-5">{{ 'verify.delivre_par' | t }}</dt><dd class="col-sm-7">{{ r.issued_by.structure }}<br /><small class="dt-muted">{{ r.issued_by.institution }}</small></dd>
                }
                @if (r.document_types?.length) {
                  <dt class="col-sm-5">{{ 'verify.piece_s' | t }}</dt><dd class="col-sm-7">{{ r.document_types!.join(', ') }}</dd>
                }
                @if (r.holder_initials) {
                  <dt class="col-sm-5">{{ 'verify.titulaire' | t }}</dt><dd class="col-sm-7">{{ r.holder_initials }}</dd>
                }
                @if (r.status !== 'valid' && r.revocation_reason) {
                  <dt class="col-sm-5">{{ 'verify.motif' | t }}</dt><dd class="col-sm-7">{{ r.revocation_reason }} ({{ r.revoked_at }})</dd>
                }
              </dl>
              @if (r.certified; as c) {
                <div class="dt-callout dt-callout--success mt-3 mb-0">
                  <i class="fas fa-check-double" aria-hidden="true"></i>
                  <div><strong>{{ 'verify.declaration_certifiee_au_guichet' | t }}</strong> {{ 'verify.un_certificat_de_perte_a_ete' | t }} {{ c.date }} {{ 'verify.par' | t }} {{ c.structure }}@if (c.institution) { ({{ c.institution }}) }.</div>
                </div>
              } @else if (r.kind === 'receipt' && r.status === 'valid') {
                <p class="small dt-muted mt-3 mb-0">{{ 'verify.ce_recepisse_prouve_seulement_l_enregist' | t }}</p>
              }
            </div>
          }
        } @else if (error()) {
          <div class="alert alert-danger mt-3">{{ error() }}</div>
        }
      </div>
    </div>
    <app-footer />
  `,
})
export class VerifyComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly api = inject(CitizenApi);
  private readonly router = inject(Router);

  /** Code lu dans l'adresse /verifier/:code (facultatif). */
  readonly code = input<string | undefined>();

  typed = '';
  readonly loading = signal(false);
  readonly result = signal<VerificationView | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const code = this.code();
    if (code) {
      this.typed = code;
      this.check(code);
    }
  }

  search(): void {
    const code = this.typed.trim().toUpperCase();
    if (code) {
      this.router.navigate(['/verifier', code], { replaceUrl: true });
      this.check(code);
    }
  }

  private check(code: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.api.verify(code).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        if (e?.status === 404 && e?.error?.found === false) {
          this.result.set(e.error);
        } else {
          this.error.set(apiErrorMessage(e, this.i18n.t('verify.verification_impossible_pour_le_moment')));
        }
      },
    });
  }
}
