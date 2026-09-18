import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SideheadersComponent } from '../sideheaders/sideheaders.component';
import { DeclarationService } from '../services/declaration.service';

@Component({
  selector: 'app-admincertif',
  standalone: true,
  imports: [CommonModule, FormsModule, SideheadersComponent],
  templateUrl: './admincertif.component.html',
  styleUrls: ['./admincertif.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [DatePipe],
})
export class AdmincertifComponent implements OnInit {

  certificats: any[]          = [];
  filteredCertificats: any[]  = [];
  paginatedCertificats: any[] = [];
  isLoading                   = false;

  // Filtres
  searchTerm     = '';
  selectedType   = '';
  selectedPeriod = '';
  documentTypes: string[] = [];

  // Pagination
  currentPage  = 1;
  itemsPerPage = 10;
  totalPages   = 1;
  pageNumbers: number[] = [];

  // Stats
  totalCertificats  = 0;
  certificatsDuMois = 0;
  typeDocumentTop   = '—';
  uniqueDeclarants  = 0;

  constructor(private declarationService: DeclarationService) {}

  ngOnInit(): void {
    this.loadCertificats();
  }

  // ── Chargement ────────────────────────────────

  loadCertificats(): void {
    this.isLoading = true;

    this.declarationService.getCertificates().subscribe({
      next: (data) => {
        this.certificats = data;
        this.buildFilters();
        this.computeStats();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Filtres ────────────────────────────────────

  buildFilters(): void {
    const types = this.certificats
      .map(c => c.declaration?.document_type?.TypeName)
      .filter(Boolean);
    this.documentTypes = [...new Set(types)] as string[];
  }

  applyFilters(): void {
    let result = [...this.certificats];
    const term = this.searchTerm.toLowerCase().trim();

    if (term) {
      result = result.filter(c =>
        c.declaration?.user?.FirstName?.toLowerCase().includes(term)       ||
        c.declaration?.user?.LastName?.toLowerCase().includes(term)        ||
        c.declaration?.user?.email?.toLowerCase().includes(term)           ||
        c.declaration?.FirstNameInDoc?.toLowerCase().includes(term)        ||
        c.declaration?.LastNameInDoc?.toLowerCase().includes(term)         ||
        c.declaration?.document_type?.TypeName?.toLowerCase().includes(term)
      );
    }

    if (this.selectedType) {
      result = result.filter(c =>
        c.declaration?.document_type?.TypeName === this.selectedType
      );
    }

    if (this.selectedPeriod) {
      const now   = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      result = result.filter(c => {
        const date = new Date(c.created_at);
        if (this.selectedPeriod === 'today') return date >= today;
        if (this.selectedPeriod === 'week') {
          const week = new Date(today);
          week.setDate(today.getDate() - 7);
          return date >= week;
        }
        if (this.selectedPeriod === 'month') {
          return date >= new Date(now.getFullYear(), now.getMonth(), 1);
        }
        return true;
      });
    }

    this.filteredCertificats = result;
    this.currentPage = 1;
    this.updatePagination();
  }

  resetFilters(): void {
    this.searchTerm     = '';
    this.selectedType   = '';
    this.selectedPeriod = '';
    this.applyFilters();
  }

  // ── Pagination ─────────────────────────────────

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(
      this.filteredCertificats.length / this.itemsPerPage
    ));
    this.pageNumbers = Array.from(
      { length: this.totalPages }, (_, i) => i + 1
    );
    this.paginate();
  }

  paginate(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedCertificats = this.filteredCertificats
      .slice(start, start + this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.paginate();
  }

  // ── Stats ──────────────────────────────────────

  computeStats(): void {
    this.totalCertificats = this.certificats.length;

    const now   = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1);

    this.certificatsDuMois = this.certificats.filter(c =>
      new Date(c.created_at) >= month
    ).length;

    const typeCount: Record<string, number> = {};
    this.certificats.forEach(c => {
      const t = c.declaration?.document_type?.TypeName;
      if (t) typeCount[t] = (typeCount[t] ?? 0) + 1;
    });
    const sorted = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
    this.typeDocumentTop = sorted[0]?.[0] ?? '—';

    const emails = new Set(
      this.certificats.map(c => c.declaration?.user?.email).filter(Boolean)
    );
    this.uniqueDeclarants = emails.size;
  }

  // ── Actions PDF ────────────────────────────────

  voirCertificat(uuid: string): void {
    this.declarationService.viewCertificate(uuid);
  }

  telechargerCertificat(uuid: string): void {
    this.declarationService.triggerDownload(
      uuid,
      `certificat_${uuid}.pdf`
    );
  }
}
