import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/state.components';

/** Écran provisoire des entrées du menu dont l'écran arrive dans un prochain sprint. */
@Component({
  selector: 'app-coming-soon',
  imports: [RouterLink, PageHeaderComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="title" />
    <div class="card border-0 shadow-sm">
      <app-empty-state icon="fa-tools" title="Écran en préparation"
        [text]="'Cet écran arrive au sprint ' + sprint + ' du plan frontend V2.'">
        <a routerLink="/espace" class="btn btn-outline-primary btn-sm mt-2">Retour au tableau de bord</a>
      </app-empty-state>
    </div>
  `,
})
export class ComingSoonComponent {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  readonly title: string = this.data['title'] ?? 'Bientôt disponible';
  readonly sprint: string = this.data['sprint'] ?? '';
}
