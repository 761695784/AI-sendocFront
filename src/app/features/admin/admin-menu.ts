/**
 * Menu de l'espace super admin (/admin). `legacy` = écran historique (API V1)
 * conservé tel quel dans la nouvelle mise en page.
 */
export interface AdminMenuItem {
  path: string;
  label: string;
  icon: string;
  legacy?: boolean;
}

export interface AdminMenuSection {
  title: string;
  items: AdminMenuItem[];
}

export const ADMIN_MENU: AdminMenuSection[] = [
  {
    title: '',
    items: [
      { path: '', label: 'Accueil', icon: 'fa-home' },
      { path: 'messages', label: 'Boîte de réception', icon: 'fa-inbox' },
    ],
  },
  {
    title: 'Pilotage national',
    items: [
      { path: 'statistiques', label: 'Statistiques et délais', icon: 'fa-chart-line' },
      { path: 'vigilance', label: 'Vigilance', icon: 'fa-shield-alt' },
      { path: 'rapports', label: 'Rapports et synthèses IA', icon: 'fa-file-invoice' },
      { path: 'envois', label: 'Suivi des envois', icon: 'fa-paper-plane' },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { path: 'structures', label: 'Structures', icon: 'fa-sitemap' },
      { path: 'types-structure', label: 'Types de structure', icon: 'fa-tags' },
      { path: 'facturation', label: 'Tarifs et reversements', icon: 'fa-coins' },
    ],
  },
  {
    title: 'Contenus et comptes',
    items: [
      { path: 'adminpub', label: 'Publications', icon: 'fa-newspaper', legacy: true },
      { path: 'admindec', label: 'Déclarations en ligne', icon: 'fa-file-alt', legacy: true },
      { path: 'admincertif', label: 'Certificats', icon: 'fa-certificate', legacy: true },
      { path: 'adminuser', label: 'Utilisateurs', icon: 'fa-users', legacy: true },
      { path: 'adminstats', label: 'Statistiques (historique)', icon: 'fa-chart-bar', legacy: true },
      { path: 'adminlogs', label: "Journal d'activités", icon: 'fa-history', legacy: true },
      { path: 'adminbackup', label: 'Sauvegardes', icon: 'fa-database', legacy: true },
    ],
  },
];
