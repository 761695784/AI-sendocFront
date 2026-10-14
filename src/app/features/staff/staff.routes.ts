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
        data: { icon: 'fa-user' },
        canActivate: [abilityGuard('citizens.search')],
        title: 'Citoyens — DocTrack',
        loadComponent: () => import('./citizens/citizens.component').then((m) => m.StaffCitizensComponent),
      },
      {
        path: 'declarations',
        data: { icon: 'fa-file-alt' },
        canActivate: [abilityGuard('declarations.view')],
        title: 'Déclarations — DocTrack',
        loadComponent: () => import('./declarations/declarations-list.component').then((m) => m.StaffDeclarationsListComponent),
      },
      {
        path: 'declarations/nouvelle',
        data: { icon: 'fa-file-alt' },
        canActivate: [abilityGuard('declarations.create')],
        title: 'Nouvelle déclaration — DocTrack',
        loadComponent: () => import('./declarations/declaration-new.component').then((m) => m.StaffDeclarationNewComponent),
      },
      {
        path: 'declarations/:uuid',
        data: { icon: 'fa-file-alt' },
        canActivate: [abilityGuard('declarations.view')],
        title: 'Déclaration — DocTrack',
        loadComponent: () => import('./declarations/declaration-detail.component').then((m) => m.StaffDeclarationDetailComponent),
      },
      {
        path: 'documents',
        data: { icon: 'fa-id-card' },
        canActivate: [abilityGuard('found_documents.view')],
        title: 'Documents trouvés — DocTrack',
        loadComponent: () => import('./documents/documents-list.component').then((m) => m.StaffDocumentsListComponent),
      },
      {
        path: 'documents/depot',
        data: { icon: 'fa-id-card' },
        canActivate: [abilityGuard('found_documents.create')],
        title: 'Dépôt — DocTrack',
        loadComponent: () => import('./documents/document-deposit.component').then((m) => m.StaffDocumentDepositComponent),
      },
      {
        path: 'documents/:uuid',
        data: { icon: 'fa-id-card' },
        canActivate: [abilityGuard('found_documents.view')],
        title: 'Document trouvé — DocTrack',
        loadComponent: () => import('./documents/document-detail.component').then((m) => m.StaffDocumentDetailComponent),
      },
      {
        path: 'documents/:uuid/restituer',
        data: { icon: 'fa-id-card' },
        canActivate: [abilityGuard('restitutions.perform')],
        title: 'Restitution — DocTrack',
        loadComponent: () => import('./documents/document-restitution.component').then((m) => m.StaffDocumentRestitutionComponent),
      },
      {
        path: 'correspondances',
        data: { icon: 'fa-link' },
        canActivate: [abilityGuard('matches.view')],
        title: 'Correspondances — DocTrack',
        loadComponent: () => import('./matches/matches-list.component').then((m) => m.StaffMatchesListComponent),
      },
      {
        path: 'correspondances/:uuid',
        data: { icon: 'fa-link' },
        canActivate: [abilityGuard('matches.view')],
        title: 'Correspondance — DocTrack',
        loadComponent: () => import('./matches/match-detail.component').then((m) => m.StaffMatchDetailComponent),
      },
      {
        path: 'retraits',
        data: { icon: 'fa-people-arrows' },
        canActivate: [abilityGuard('collections.view')],
        title: 'Retraits — DocTrack',
        loadComponent: () => import('./collections/collections-list.component').then((m) => m.StaffCollectionsListComponent),
      },
      {
        path: 'retraits/:uuid',
        data: { icon: 'fa-people-arrows' },
        canActivate: [abilityGuard('collections.view')],
        title: 'Retrait — DocTrack',
        loadComponent: () => import('./collections/collection-detail.component').then((m) => m.StaffCollectionDetailComponent),
      },
      {
        path: 'restitutions',
        data: { icon: 'fa-handshake' },
        canActivate: [abilityGuard('restitutions.view')],
        title: 'Restitutions — DocTrack',
        loadComponent: () => import('./restitutions/restitutions.component').then((m) => m.StaffRestitutionsListComponent),
      },
      {
        path: 'restitutions/:uuid',
        data: { icon: 'fa-handshake' },
        canActivate: [abilityGuard('restitutions.view')],
        title: 'Restitution — DocTrack',
        loadComponent: () => import('./restitutions/restitutions.component').then((m) => m.StaffRestitutionDetailComponent),
      },
      {
        path: 'frais',
        data: { icon: 'fa-coins' },
        canActivate: [abilityGuard('billing.view', 'billing.collect')],
        title: 'Frais — DocTrack',
        loadComponent: () => import('./charges/charges.component').then((m) => m.StaffChargesComponent),
      },

      // ── Pilotage (S5) ──
      {
        path: 'messages',
        data: { icon: 'fa-inbox' },
        title: 'Boîte de réception — DocTrack',
        loadComponent: () => import('./messages/messages.component').then((m) => m.StaffMessagesComponent),
      },
      {
        path: 'statistiques',
        data: { icon: 'fa-chart-line' },
        canActivate: [abilityGuard('stats.view')],
        title: 'Statistiques et délais — DocTrack',
        loadComponent: () => import('./stats/stats.component').then((m) => m.StaffStatsComponent),
      },
      {
        path: 'vigilance',
        data: { icon: 'fa-shield-alt' },
        canActivate: [abilityGuard('vigilance.view')],
        title: 'Vigilance — DocTrack',
        loadComponent: () => import('./vigilance/vigilance.component').then((m) => m.StaffVigilanceComponent),
      },
      {
        path: 'vigilance/:uuid',
        data: { icon: 'fa-shield-alt' },
        canActivate: [abilityGuard('vigilance.view')],
        title: 'Alerte de vigilance — DocTrack',
        loadComponent: () => import('./vigilance/vigilance.component').then((m) => m.StaffVigilanceDetailComponent),
      },
      {
        path: 'rapports',
        data: { icon: 'fa-file-invoice' },
        canActivate: [abilityGuard('stats.view')],
        title: 'Rapports — DocTrack',
        loadComponent: () => import('./reports/reports.component').then((m) => m.StaffReportsComponent),
      },
      {
        path: 'rapports/:uuid',
        data: { icon: 'fa-file-invoice' },
        canActivate: [abilityGuard('stats.view')],
        title: 'Rapport — DocTrack',
        loadComponent: () => import('./reports/reports.component').then((m) => m.StaffReportDetailComponent),
      },
      {
        path: 'membres',
        data: { icon: 'fa-users' },
        canActivate: [abilityGuard('members.view')],
        title: 'Membres — DocTrack',
        loadComponent: () => import('./members/members.component').then((m) => m.StaffMembersComponent),
      },
      {
        path: 'structures',
        data: { icon: 'fa-sitemap' },
        canActivate: [abilityGuard('organizations.create_child')],
        title: 'Structures — DocTrack',
        loadComponent: () => import('./structures/structures.component').then((m) => m.StaffStructuresComponent),
      },
      {
        path: 'envois',
        data: { icon: 'fa-paper-plane' },
        canActivate: [abilityGuard('audit.view')],
        title: 'Suivi des envois — DocTrack',
        loadComponent: () => import('./deliveries/deliveries.component').then((m) => m.StaffDeliveriesComponent),
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
