import { Routes } from '@angular/router';
import { abilityGuard } from '../../core/guards/access.guards';
import { StaffShellComponent } from './shell/staff-shell.component';
import { StaffHomeComponent } from './home/staff-home.component';
import { ComingSoonComponent } from './coming-soon/coming-soon.component';
import { STAFF_UPCOMING } from './staff-menu';

/**
 * Espace des structures (/espace/...). Protégé par staffGuard (app.routes.ts) ;
 * chaque écran vérifie en plus le droit correspondant de la structure active.
 * Écrans chargés à la demande. Les entrées des sprints suivants affichent une page provisoire.
 */
export const STAFF_ROUTES: Routes = [
  {
    path: '',
    component: StaffShellComponent,
    children: [
      { path: '', component: StaffHomeComponent, title: 'Espace structure — DocTrack' },

      // ── Guichet (S4) ──
      {
        path: 'citoyens',
        canActivate: [abilityGuard('citizens.search')],
        title: 'Citoyens — DocTrack',
        loadComponent: () => import('./citizens/citizens.component').then((m) => m.StaffCitizensComponent),
      },
      {
        path: 'declarations',
        canActivate: [abilityGuard('declarations.view')],
        title: 'Déclarations — DocTrack',
        loadComponent: () => import('./declarations/declarations-list.component').then((m) => m.StaffDeclarationsListComponent),
      },
      {
        path: 'declarations/nouvelle',
        canActivate: [abilityGuard('declarations.create')],
        title: 'Nouvelle déclaration — DocTrack',
        loadComponent: () => import('./declarations/declaration-new.component').then((m) => m.StaffDeclarationNewComponent),
      },
      {
        path: 'declarations/:uuid',
        canActivate: [abilityGuard('declarations.view')],
        title: 'Déclaration — DocTrack',
        loadComponent: () => import('./declarations/declaration-detail.component').then((m) => m.StaffDeclarationDetailComponent),
      },
      {
        path: 'documents',
        canActivate: [abilityGuard('found_documents.view')],
        title: 'Documents trouvés — DocTrack',
        loadComponent: () => import('./documents/documents-list.component').then((m) => m.StaffDocumentsListComponent),
      },
      {
        path: 'documents/depot',
        canActivate: [abilityGuard('found_documents.create')],
        title: 'Dépôt — DocTrack',
        loadComponent: () => import('./documents/document-deposit.component').then((m) => m.StaffDocumentDepositComponent),
      },
      {
        path: 'documents/:uuid',
        canActivate: [abilityGuard('found_documents.view')],
        title: 'Document trouvé — DocTrack',
        loadComponent: () => import('./documents/document-detail.component').then((m) => m.StaffDocumentDetailComponent),
      },
      {
        path: 'documents/:uuid/restituer',
        canActivate: [abilityGuard('restitutions.perform')],
        title: 'Restitution — DocTrack',
        loadComponent: () => import('./documents/document-restitution.component').then((m) => m.StaffDocumentRestitutionComponent),
      },
      {
        path: 'correspondances',
        canActivate: [abilityGuard('matches.view')],
        title: 'Correspondances — DocTrack',
        loadComponent: () => import('./matches/matches-list.component').then((m) => m.StaffMatchesListComponent),
      },
      {
        path: 'correspondances/:uuid',
        canActivate: [abilityGuard('matches.view')],
        title: 'Correspondance — DocTrack',
        loadComponent: () => import('./matches/match-detail.component').then((m) => m.StaffMatchDetailComponent),
      },
      {
        path: 'retraits',
        canActivate: [abilityGuard('collections.view')],
        title: 'Retraits — DocTrack',
        loadComponent: () => import('./collections/collections-list.component').then((m) => m.StaffCollectionsListComponent),
      },
      {
        path: 'retraits/:uuid',
        canActivate: [abilityGuard('collections.view')],
        title: 'Retrait — DocTrack',
        loadComponent: () => import('./collections/collection-detail.component').then((m) => m.StaffCollectionDetailComponent),
      },
      {
        path: 'restitutions',
        canActivate: [abilityGuard('restitutions.view')],
        title: 'Restitutions — DocTrack',
        loadComponent: () => import('./restitutions/restitutions.component').then((m) => m.StaffRestitutionsListComponent),
      },
      {
        path: 'restitutions/:uuid',
        canActivate: [abilityGuard('restitutions.view')],
        title: 'Restitution — DocTrack',
        loadComponent: () => import('./restitutions/restitutions.component').then((m) => m.StaffRestitutionDetailComponent),
      },
      {
        path: 'frais',
        canActivate: [abilityGuard('billing.view', 'billing.collect')],
        title: 'Frais — DocTrack',
        loadComponent: () => import('./charges/charges.component').then((m) => m.StaffChargesComponent),
      },

      // ── Sprints suivants : pages provisoires ──
      ...STAFF_UPCOMING.map((item) => ({
        path: item.path,
        component: ComingSoonComponent,
        canActivate: item.abilities ? [abilityGuard(...item.abilities)] : [],
        data: { title: item.label, sprint: item.sprint },
        title: `${item.label} — DocTrack`,
      })),
    ],
  },
];
