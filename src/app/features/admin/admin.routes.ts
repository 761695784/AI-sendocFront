import { Routes } from '@angular/router';
import { AdminShellComponent } from './shell/admin-shell.component';

/** Données de route : les écrans de pilotage partagés affichent le périmètre national. */
const NATIONAL = { national: true };

/**
 * Espace super admin (/admin). Protégé par superAdminGuard (app.routes.ts).
 * - écrans V2 propres à l'admin : accueil, types de structure, tarifs ;
 * - écrans de pilotage partagés avec l'espace des structures (périmètre national) ;
 * - écrans historiques V1 (publications, déclarations, utilisateurs…) dans la même mise en page.
 * Tout est chargé à la demande : le code de l'administration n'est téléchargé que par l'admin.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', title: 'Administration — DocTrack', loadComponent: () => import('./home/admin-home.component').then((m) => m.AdminHomeComponent) },

      // ── Pilotage national (écrans partagés) ──
      { path: 'messages', title: 'Boîte de réception — DocTrack', loadComponent: () => import('../staff/messages/messages.component').then((m) => m.StaffMessagesComponent) },
      { path: 'statistiques', data: NATIONAL, title: 'Statistiques nationales — DocTrack', loadComponent: () => import('../staff/stats/stats.component').then((m) => m.StaffStatsComponent) },
      { path: 'vigilance', title: 'Vigilance — DocTrack', loadComponent: () => import('../staff/vigilance/vigilance.component').then((m) => m.StaffVigilanceComponent) },
      { path: 'vigilance/:uuid', title: 'Alerte de vigilance — DocTrack', loadComponent: () => import('../staff/vigilance/vigilance.component').then((m) => m.StaffVigilanceDetailComponent) },
      { path: 'rapports', data: NATIONAL, title: 'Rapports — DocTrack', loadComponent: () => import('../staff/reports/reports.component').then((m) => m.StaffReportsComponent) },
      { path: 'rapports/:uuid', title: 'Rapport — DocTrack', loadComponent: () => import('../staff/reports/reports.component').then((m) => m.StaffReportDetailComponent) },
      { path: 'envois', title: 'Suivi des envois — DocTrack', loadComponent: () => import('../staff/deliveries/deliveries.component').then((m) => m.StaffDeliveriesComponent) },

      // ── Organisation ──
      { path: 'structures', title: 'Structures — DocTrack', loadComponent: () => import('../staff/structures/structures.component').then((m) => m.StaffStructuresComponent) },
      { path: 'membres', title: 'Membres — DocTrack', loadComponent: () => import('../staff/members/members.component').then((m) => m.StaffMembersComponent) },
      { path: 'types-structure', title: 'Types de structure — DocTrack', loadComponent: () => import('./organization-types/organization-types.component').then((m) => m.AdminOrganizationTypesComponent) },
      { path: 'facturation', title: 'Tarifs et reversements — DocTrack', loadComponent: () => import('./billing/billing.component').then((m) => m.AdminBillingComponent) },

      // ── Écrans historiques (API V1), mêmes adresses qu'avant ──
      { path: 'profil', title: 'Mon profil — DocTrack', loadComponent: () => import('../../components/adminprofil/adminprofil.component').then((m) => m.AdminprofilComponent) },
      { path: 'adminpub', title: 'Publications — DocTrack', loadComponent: () => import('../../components/adminpub/adminpub.component').then((m) => m.AdminpubComponent) },
      { path: 'admindetails/:uuid', title: 'Publication — DocTrack', loadComponent: () => import('../../components/admindetails/admindetails.component').then((m) => m.AdmindetailsComponent) },
      { path: 'admindec', title: 'Déclarations en ligne — DocTrack', loadComponent: () => import('../../components/admindeclaration/admindeclaration.component').then((m) => m.AdmindeclarationComponent) },
      { path: 'admincertif', title: 'Certificats — DocTrack', loadComponent: () => import('../../components/admincertif/admincertif.component').then((m) => m.AdmincertifComponent) },
      { path: 'adminuser', title: 'Utilisateurs — DocTrack', loadComponent: () => import('../../components/userget/userget.component').then((m) => m.UsergetComponent) },
      { path: 'adminadd', title: 'Nouvel utilisateur — DocTrack', loadComponent: () => import('../../components/user-add/user-add.component').then((m) => m.UserAddComponent) },
      { path: 'adminstats', title: 'Statistiques (historique) — DocTrack', loadComponent: () => import('../../components/adminstats/adminstats.component').then((m) => m.AdminstatsComponent) },
      { path: 'adminlogs', title: "Journal d'activités — DocTrack", loadComponent: () => import('../../components/adminlogs/adminlogs.component').then((m) => m.AdminlogsComponent) },
      { path: 'adminbackup', title: 'Sauvegardes — DocTrack', loadComponent: () => import('../../components/adminbackup/adminbackup.component').then((m) => m.AdminbackupComponent) },
      { path: 'activite', title: 'Activité (historique) — DocTrack', loadComponent: () => import('../../components/admin/admin.component').then((m) => m.AdminComponent) },
      // L'ancien écran « Rapports » (V1) est remplacé par les rapports V2 (PDF, Excel, synthèse IA).
      { path: 'adminrapport', redirectTo: 'rapports' },
    ],
  },
];
