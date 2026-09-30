import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { CitizenApi } from '../../../core/api/citizen.api';
import { CollectionSummary, PublishedDocument } from '../../../core/api/citizen.types';
import { apiErrorMessage } from '../../../core/api/api-v2.client';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../../shared/ui/state.components';
import { PaginatorComponent } from '../../../shared/ui/paginator.component';

interface FindRow {
  doc: PublishedDocument;
  collection: CollectionSummary | null;
}

const COLLECTION_TEXT: Record<string, string> = {
  unassigned: 'Nous cherchons une structure proche pour récupérer le document.',
  assigned: 'Une structure va vous appeler pour organiser la récupération.',
  contacted: 'La structure vous a contacté ; le rendez-vous va être fixé.',
  planned: 'Rendez-vous fixé pour la remise du document.',
  collected: 'Document remis à la structure. Merci pour votre geste !',
  cancelled: 'Récupération annulée.',
};

/** Documents que j'ai trouvés et publiés, avec le suivi de leur récupération par une structure. */
@Component({
  selector: 'app-my-finds',
  imports: [DatePipe, RouterLink, StatusBadgeComponent, LoadingComponent, EmptyStateComponent, ErrorStateComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-finds.component.html',
})
export class MyFindsComponent implements OnInit {
  private readonly api = inject(CitizenApi);

  readonly rows = signal<FindRow[]>([]);
  readonly page = signal<{ current_page: number; last_page: number; total: number } | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.myPublications(page).subscribe({
      next: (res) => {
        this.page.set(res.meta ?? null);
        const docs = res.data ?? [];
        // Suivi de collecte : seulement pour les documents encore chez le trouveur.
        const calls = docs.map((doc) =>
          doc.custody || doc.lifecycle_status === 'restituted'
            ? of({ doc, collection: null })
            : this.api.collectionOf(doc.uuid).pipe(
                map((collection) => ({ doc, collection })),
                catchError(() => of({ doc, collection: null })),
              ),
        );
        (calls.length ? forkJoin(calls) : of([])).subscribe((rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        });
      },
      error: (e) => {
        this.error.set(apiErrorMessage(e, 'Impossible de charger vos publications.'));
        this.loading.set(false);
      },
    });
  }

  collectionText(c: CollectionSummary): string {
    return COLLECTION_TEXT[c.status] ?? c.status;
  }
}
