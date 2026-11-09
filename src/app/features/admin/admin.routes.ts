import { Routes } from '@angular/router';
import { AdminShellComponent } from './shell/admin-shell.component';

/** Données de route : les écrans de pilotage partagés affichent le périmètre national ; `icon` = pastille de l'en-tête de page. */
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
      { path: '', data: { icon: 'fa-home' }, title: 'Administration — DocTrack', loadComponent: () => import('./home/admin-home.component').then((m) => m.AdminHomeComponent) },

      // ── Pilotage national (écrans partagés) ──
      { path: 'messages', data: { icon: 'fa-inbox' }, title: 'Boîte de réception — DocTrack', loadComponent: () => import('../staff/messages/messages.component').then((m) => m.StaffMessagesComponent) },
      { path: 'statistiques', data: { ...NATIONAL, icon: 'fa-chart-line' }, title: 'Statistiques nationales — DocTrack', loadComponent: () => import('../staff/stats/stats.component').then((m) => m.StaffStatsComponent) },
      { path: 'vigilance', data: { icon: 'fa-shield-alt' }, title: 'Vigilance — DocTrack', loadComponent: () => import('../staff/vigilance/vigilance.component').then((m) => m.StaffVigilanceComponent) },
      { path: 'vigilance/:uuid', data: { icon: 'fa-shield-alt' }, title: 'Alerte de vigilance — DocTrack', loadComponent: () => import('../staff/vigilance/vigilance.component').then((m) => m.StaffVigilanceDetailComponent) },
      { path: 'rapports', data: { ...NATIONAL, icon: 'fa-file-invoice' }, title: 'Rapports — DocTrack', loadComponent: () => import('../staff/reports/reports.component').then((m) => m.StaffReportsComponent) },
      { path: 'rapports/:uuid', data: { icon: 'fa-file-invoice' }, title: 'Rapport — DocTrack', loadComponent: () => import('../staff/reports/reports.component').then((m) => m.StaffReportDetailComponent) },
      { path: 'envois', data: { icon: 'fa-paper-plane' }, title: 'Suivi des envois — DocTrack', loadComponent: () => import('../staff/deliveries/deliveries.component').then((m) => m.StaffDeliveriesComponent) },

      // ── Organisation ──
      { path: 'structures', data: { icon: 'fa-sitemap' }, title: 'Structures — DocTrack', loadComponent: () => import('../staff/structures/structures.component').then((m) => m.StaffStructuresComponent) },
      { path: 'membres', data: { icon: 'fa-users' }, title: 'Membres — DocTrack', loadComponent: () => import('../staff/members/members.component').then((m) => m.StaffMembersComponent) },
      { path: 'types-structure', data: { icon: 'fa-tags' }, title: 'Types de structure — DocTrack', loadComponent: () => import('./organization-types/organization-types.component').then((m) => m.AdminOrganizationTypesComponent) },
      { path: 'facturation', data: { icon: 'fa-coins' }, title: 'Tarifs et reversements — DocTrack', loadComponent: () => import('./billing/billing.component').then((m) => m.AdminBillingComponent) },
      { path: 'temoignages', data: { icon: 'fa-comment-dots' }, title: 'Témoignages — DocTrack', loadComponent: () => import('./testimonials/testimonials.component').then((m) => m.AdminTestimonialsComponent) },
      { path: 'voix-assistant', data: { icon: 'fa-volume-up' }, title: "Voix de l'assistant — DocTrack", loadComponent: () => import('./assistant-voices/assistant-voices.component').then((m) => m.AdminAssistantVoicesComponent) },

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
