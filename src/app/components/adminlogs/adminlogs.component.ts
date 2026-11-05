import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../services/auth.service';

/** Une propriété affichable d'un log (clé → valeur courte). */
interface LogProp { key: string; value: string; }

/** Log prêt à afficher : tout est calculé une seule fois, au chargement (jamais dans le gabarit). */
interface LogView {
  id: number;
  description: string;
  event: string | null;
  createdAt: string;
  subjectLabel: string;
  subjectId: number | null;
  subjectClass: string;
  subjectIcon: string;
  actionClass: string;
  actionIcon: string;
  eventClass: string;
  causerName: string | null;
  causerEmail: string | null;
  initials: string;
  props: LogProp[];
}

type Filter = 'all' | 'documents' | 'declarations' | 'users';

/**
 * Journal d'activité (super admin).
 * Page légère : 20 lignes par page, recherche faite par l'API (sur tout le journal, pas seulement la page),
 * détails pré-calculés. L'ancien écran recalculait les propriétés à chaque rafraîchissement et chargeait
 * l'objet concerné en entier : il pouvait geler le navigateur.
 */
@Component({
  selector: 'app-adminlogs',
  imports: [DatePipe, FormsModule],
  templateUrl: './adminlogs.component.html',
  styleUrls: ['./adminlogs.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminlogsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();
  private request?: Subscription;

  readonly logs = signal<LogView[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeFilter = signal<Filter>('all');
  readonly currentPage = signal(1);
  readonly lastPage = signal(1);
  readonly totalLogs = signal(0);
  readonly selectedLog = signal<LogView | null>(null);
  searchTerm = '';

  ngOnInit(): void {
    this.search$.pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadLogs(1));
    this.loadLogs(1);
  }

  loadLogs(page = 1): void {
    this.request?.unsubscribe();
    this.isLoading.set(true);
    this.error.set(null);
    const filter = this.activeFilter();
    const q = this.searchTerm.trim();
    const obs = filter === 'all'
      ? this.authService.getActivityLogs(page, q)
      : this.authService.getActivityLogsByType(filter, page, q);

    this.request = obs.subscribe({
      next: (res: any) => {
        const rows: any[] = Array.isArray(res?.data) ? res.data : [];
        this.logs.set(rows.map((r) => this.toView(r)));
        this.currentPage.set(res?.current_page ?? page);
        this.lastPage.set(Math.max(1, res?.last_page ?? 1));
        this.totalLogs.set(res?.total ?? rows.length);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.logs.set([]);
        this.isLoading.set(false);
        this.error.set(err?.error?.message || err?.message || 'Le journal n’a pas pu être chargé. Réessayez.');
      },
    });
  }

  setFilter(filter: Filter): void {
    if (filter === this.activeFilter()) {
      return;
    }
    this.activeFilter.set(filter);
    this.loadLogs(1);
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.search$.next(value.trim());
  }

  changePage(page: number): void {
    if (page < 1 || page > this.lastPage() || this.isLoading()) {
      return;
    }
    this.loadLogs(page);
  }

  openDetail(log: LogView): void { this.selectedLog.set(log); }
  closeDetail(): void { this.selectedLog.set(null); }

  // ── Préparation d'une ligne (une seule fois) ─────────────────────
  private toView(r: any): LogView {
    const description = String(r?.description ?? '');
    const subjectType = String(r?.subject_type ?? '');
    const causer = r?.causer ?? null;
    const name = causer ? [causer.FirstName, causer.LastName].filter(Boolean).join(' ') : null;
    return {
      id: r?.id,
      description,
      event: r?.event ?? null,
      createdAt: r?.created_at,
      subjectLabel: subjectType ? AdminlogsComponent.subjectLabel(subjectType) : '',
      subjectId: r?.subject_id ?? null,
      subjectClass: AdminlogsComponent.subjectClass(subjectType),
      subjectIcon: AdminlogsComponent.subjectIcon(subjectType),
      actionClass: AdminlogsComponent.actionClass(description),
      actionIcon: AdminlogsComponent.actionIcon(description),
      eventClass: ({ created: 'event-created', updated: 'event-updated', deleted: 'event-deleted' } as Record<string, string>)[r?.event] ?? 'event-default',
      causerName: name || null,
      causerEmail: causer?.email ?? null,
      initials: name ? name.split(' ').map((p: string) => p.charAt(0)).join('').slice(0, 2).toUpperCase() : '',
      props: AdminlogsComponent.props(r?.properties),
    };
  }

  /** Accepte la liste préparée par l'API, ou l'ancien format (objet) par sécurité. */
  private static props(raw: unknown): LogProp[] {
    if (Array.isArray(raw)) {
      return raw.slice(0, 20).map((p: any) => ({ key: String(p?.key ?? ''), value: String(p?.value ?? '') }));
    }
    if (!raw || typeof raw !== 'object') {
      return [];
    }
    const source: Record<string, unknown> = (raw as any).attributes ?? (raw as Record<string, unknown>);
    return Object.entries(source)
      .filter(([k]) => !/password|token|hash|encrypted/i.test(k) && k !== 'id')
      .slice(0, 20)
      .map(([key, value]) => ({
        key,
        value: (typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')).slice(0, 160),
      }));
  }

  private static actionClass(d: string): string {
    const s = d.toLowerCase();
    if (s.includes('déconnex')) return 'action-logout';
    if (s.includes('connexion')) return 'action-login';
    if (s.includes('supprim')) return 'action-delete';
    if (s.includes('restaur')) return 'action-restore';
    if (s.includes('créé') || s.includes('inscrit') || s.includes('publié')) return 'action-create';
    if (s.includes('mis à jour') || s.includes('modif')) return 'action-update';
    if (s.includes('restitution')) return 'action-restitution';
    if (s.includes('qr')) return 'action-qr';
    return 'action-default';
  }

  private static actionIcon(d: string): string {
    const s = d.toLowerCase();
    if (s.includes('déconnex')) return 'fa-sign-out-alt';
    if (s.includes('connexion')) return 'fa-sign-in-alt';
    if (s.includes('supprim')) return 'fa-trash-alt';
    if (s.includes('restaur')) return 'fa-undo';
    if (s.includes('créé') || s.includes('inscrit') || s.includes('publié')) return 'fa-plus-circle';
    if (s.includes('mis à jour') || s.includes('modif')) return 'fa-edit';
    if (s.includes('restitution')) return 'fa-hand-holding';
    if (s.includes('qr')) return 'fa-qrcode';
    return 'fa-circle';
  }

  private static subjectLabel(t: string): string {
    if (t.includes('Document') && !t.includes('Type')) return 'Document';
    if (t.includes('Declaration')) return 'Déclaration';
    if (t.includes('User')) return 'Utilisateur';
    if (t.includes('CitizenProfile')) return 'Personne';
    if (t.includes('Organization')) return 'Structure';
    return t.split('\\').pop() ?? '—';
  }

  private static subjectClass(t: string): string {
    if (t.includes('Document') && !t.includes('Type')) return 'subject-doc';
    if (t.includes('Declaration')) return 'subject-decl';
    if (t.includes('User')) return 'subject-user';
    return 'subject-default';
  }

  private static subjectIcon(t: string): string {
    if (t.includes('Document') && !t.includes('Type')) return 'fa-file-alt';
    if (t.includes('Declaration')) return 'fa-clipboard-list';
    if (t.includes('User')) return 'fa-user';
    return 'fa-circle';
  }
}
