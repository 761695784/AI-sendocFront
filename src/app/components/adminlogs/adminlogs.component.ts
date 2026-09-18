import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { SideheadersComponent } from "../sideheaders/sideheaders.component";

@Component({
  selector: 'app-adminlogs',
  standalone: true,
  imports: [CommonModule, FormsModule, SideheadersComponent],
  templateUrl: './adminlogs.component.html',
  styleUrls: ['./adminlogs.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AdminlogsComponent implements OnInit {

  logs: any[]         = [];
  filteredLogs: any[] = [];
  isLoading           = false;
  activeFilter        = 'all';
  searchTerm          = '';
  selectedLog: any    = null;

  // Pagination
  currentPage = 1;
  lastPage    = 1;
  totalLogs   = 0;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  // ── Chargement ────────────────────────────────

loadLogs(page = 1): void {
    this.isLoading = true;

    const obs = this.activeFilter === 'all'
        ? this.authService.getActivityLogs(page)
        : this.authService.getActivityLogsByType(this.activeFilter, page);

    obs.subscribe({
        next: (res) => {
            this.logs         = res.data;
            this.filteredLogs = res.data;
            this.currentPage  = res.current_page;
            this.lastPage     = res.last_page;
            this.totalLogs    = res.total;
            this.isLoading    = false;
            this.filterLogs();
        },
        error: (err) => {
            this.isLoading = false;
            console.error('Erreur chargement logs:', err.message);
            // ← le spinner s'arrête et affiche l'empty state
        }
    });
}

  // ── Filtres ────────────────────────────────────

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage  = 1;
    this.searchTerm   = '';
    this.loadLogs(1);
  }

  filterLogs(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredLogs = [...this.logs];
      return;
    }
    this.filteredLogs = this.logs.filter(log =>
      log.description?.toLowerCase().includes(term) ||
      log.causer?.FirstName?.toLowerCase().includes(term) ||
      log.causer?.LastName?.toLowerCase().includes(term) ||
      log.causer?.email?.toLowerCase().includes(term) ||
      log.event?.toLowerCase().includes(term)
    );
  }

  changePage(page: number): void {
    if (page < 1 || page > this.lastPage) return;
    this.loadLogs(page);
  }

  // ── Détail modal ───────────────────────────────

  openDetail(log: any): void  { this.selectedLog = log; }
  closeDetail(): void         { this.selectedLog = null; }

  // ── Helpers visuels ────────────────────────────

  getActionClass(description: string): string {
    if (!description) return 'action-default';
    const d = description.toLowerCase();
    if (d.includes('connexion'))        return 'action-login';
    if (d.includes('supprim'))          return 'action-delete';
    if (d.includes('restaur'))          return 'action-restore';
    if (d.includes('créé') || d.includes('inscrit') || d.includes('publié')) return 'action-create';
    if (d.includes('mis à jour') || d.includes('modif')) return 'action-update';
    if (d.includes('restitution'))      return 'action-restitution';
    if (d.includes('qr'))               return 'action-qr';
    if (d.includes('déconnex'))         return 'action-logout';
    return 'action-default';
  }

  getActionIcon(description: string): string {
    if (!description) return 'fa-circle';
    const d = description.toLowerCase();
    if (d.includes('connexion'))        return 'fa-sign-in-alt';
    if (d.includes('supprim'))          return 'fa-trash-alt';
    if (d.includes('restaur'))          return 'fa-undo';
    if (d.includes('créé') || d.includes('inscrit') || d.includes('publié')) return 'fa-plus-circle';
    if (d.includes('mis à jour') || d.includes('modif')) return 'fa-edit';
    if (d.includes('restitution'))      return 'fa-hand-holding';
    if (d.includes('qr'))               return 'fa-qrcode';
    if (d.includes('déconnex'))         return 'fa-sign-out-alt';
    return 'fa-circle';
  }

  getEventClass(event: string): string {
    const map: Record<string, string> = {
      created: 'event-created',
      updated: 'event-updated',
      deleted: 'event-deleted',
    };
    return map[event] ?? 'event-default';
  }

  getSubjectLabel(subjectType: string): string {
    if (subjectType?.includes('Document') && !subjectType.includes('Type')) return 'Document';
    if (subjectType?.includes('Declaration'))  return 'Déclaration';
    if (subjectType?.includes('User'))         return 'Utilisateur';
    return subjectType?.split('\\').pop() ?? '—';
  }

  getSubjectClass(subjectType: string): string {
    if (subjectType?.includes('Document') && !subjectType.includes('Type')) return 'subject-doc';
    if (subjectType?.includes('Declaration'))  return 'subject-decl';
    if (subjectType?.includes('User'))         return 'subject-user';
    return 'subject-default';
  }

  getSubjectIcon(subjectType: string): string {
    if (subjectType?.includes('Document') && !subjectType.includes('Type')) return 'fa-file-alt';
    if (subjectType?.includes('Declaration'))  return 'fa-clipboard-list';
    if (subjectType?.includes('User'))         return 'fa-user';
    return 'fa-circle';
  }

  // Extrait les propriétés clé/valeur à afficher
  getTopProps(properties: any): { key: string; value: string }[] {
    if (!properties) return [];

    // Spatie stocke les attributs dans properties.attributes ou directement
    const source = properties.attributes ?? properties;

    return Object.entries(source)
      .filter(([k]) => !['id', 'password', 'remember_token'].includes(k))
      .map(([key, value]) => ({
        key,
        value: String(value ?? '—').substring(0, 60),
      }));
  }

  getSubjectProps(subject: any): { key: string; value: string }[] {
    if (!subject) return [];
    const exclude = ['id', 'user_id', 'document_type_id', 'image', 'password'];
    return Object.entries(subject)
      .filter(([k, v]) => !exclude.includes(k) && v !== null)
      .map(([key, value]) => ({
        key,
        value: String(value).substring(0, 80),
      }));
  }
}
