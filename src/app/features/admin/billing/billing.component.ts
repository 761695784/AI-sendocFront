import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi, BillingQuery } from '../../../core/api/admin.api';
import { PilotApi } from '../../../core/api/pilot.api';
import { BillableService, BillingReport, BillingServices } from '../../../core/api/admin.types';
import { Organization } from '../../../core/api/pilot.types';
import { apiErrorMessage, saveBlob } from '../../../core/api/api-v2.client';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { isoDate } from '../../staff/stats/stats.component';
import { previousMonth } from '../../staff/reports/reports.component';

/** Montant en FCFA lisible : 3000 → « 3 000 FCFA ». */
export function fcfa(amount: number | null | undefined): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount ?? 0).replace(/ | /g, ' ')} FCFA`;
}

/**
 * Facturation (super admin) : tarifs en vigueur et leur historique (national ou propre à une institution),
 * et rapport de reversement (perçu, part des autorités, part DocTrack, exonérations, valeur du pilote gratuit).
 */
@Component({
  selector: 'app-admin-billing',
  imports: [DatePipe, DecimalPipe, FormsModule, ReactiveFormsModule, PageHeaderComponent, LoadingComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './billing.component.html',
  styles: `
    .bl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: .75rem; }
    .bl-tile { background: #fff; border: 1px solid #e3e8ef; border-radius: .75rem; padding: .8rem 1rem; display: flex; flex-direction: column; }
    .bl-tile span { color: #5f6b7a; font-size: .85rem; }
    .bl-tile strong { font-size: 1.35rem; color: #13294b; }
    .bl-tile small { color: #5f6b7a; }
    .bl-price { font-size: 1.6rem; font-weight: 700; color: #13294b; }
  `,
})
export class AdminBillingComponent implements OnInit {
  private readonly admin = inject(AdminApi);
  private readonly pilot = inject(PilotApi);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly fcfa = fcfa;
  readonly today = isoDate(new Date());

  readonly services = signal<BillingServices | null>(null);
  readonly institutions = signal<Organization[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly editing = signal<string | null>(null);
  readonly showHistory = signal<string | null>(null);
  readonly saving = signal(false);

  readonly report = signal<BillingReport | null>(null);
  readonly reportLoading = signal(false);
  readonly exporting = signal(false);
  month = previousMonth();
  institution = '';

  readonly priceForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0), Validators.max(1_000_000)]],
    authority_share_pct: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    institution_uuid: [''],
    valid_from: [''],
    note: ['', Validators.maxLength(255)],
  });

  ngOnInit(): void {
    this.loadServices();
    this.pilot.organizations({ level: 'institution' }).subscribe({ next: (p) => this.institutions.set(p.data), error: () => void 0 });
    this.loadReport();
  }

  loadServices(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin.billingServices().subscribe({
      next: (s) => {
        this.services.set(s);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e));
        this.loading.set(false);
      },
    });
  }

  edit(s: BillableService): void {
    this.editing.set(s.code);
    this.priceForm.reset({ amount: s.current.amount, authority_share_pct: s.current.authority_share_pct, institution_uuid: '', valid_from: '', note: '' });
  }

  async savePrice(s: BillableService): Promise<void> {
    if (this.priceForm.invalid) {
      this.priceForm.markAllAsTouched();
      return;
    }
    const v = this.priceForm.getRawValue();
    const target = v.institution_uuid ? (this.institutions().find((i) => i.uuid === v.institution_uuid)?.name ?? 'cette institution') : 'tout le pays';
    const ok = await this.notify.confirm({
      title: `Nouveau tarif : ${fcfa(Number(v.amount))}`,
      text: `« ${s.name} » pour ${target}, à partir du ${v.valid_from || 'jour même'}. L’ancien tarif est clôturé et reste dans l’historique.`,
      confirmText: 'Appliquer',
    });
    if (!ok) {
      return;
    }
    this.saving.set(true);
    this.admin
      .setPrice({
        service: s.code,
        amount: Number(v.amount),
        authority_share_pct: Number(v.authority_share_pct),
        institution_uuid: v.institution_uuid || null,
        valid_from: v.valid_from || null,
        note: v.note.trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing.set(null);
          this.notify.success('Tarif enregistré.');
          this.loadServices();
        },
        error: (e) => {
          this.saving.set(false);
          void this.notify.error(e);
        },
      });
  }

  query(): BillingQuery {
    return { month: this.month || null, organization: this.institution || null };
  }

  loadReport(): void {
    this.reportLoading.set(true);
    this.admin.billingReport(this.query()).subscribe({
      next: (r) => {
        this.report.set(r);
        this.reportLoading.set(false);
      },
      error: (e) => {
        this.report.set(null);
        this.reportLoading.set(false);
        void this.notify.error(e, 'Rapport indisponible');
      },
    });
  }

  exportCsv(): void {
    this.exporting.set(true);
    this.admin.billingReportCsv(this.query()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        saveBlob(blob, `doctrack-reversement-${this.month || this.today}.csv`);
      },
      error: (e) => {
        this.exporting.set(false);
        void this.notify.error(e, 'Export impossible');
      },
    });
  }
}
