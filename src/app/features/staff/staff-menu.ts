/**
 * Menu de l'espace des structures. Chaque entrée n'apparaît que si l'affectation active
 * donne l'un des droits listés (`abilities`) ; sans droit listé = visible par tous.
 * `sprint` indique quand l'écran arrive (page « bientôt disponible » en attendant).
 */
export interface StaffMenuItem {
  path: string;
  label: string;
  icon: string;
  abilities?: string[];
  sprint?: string;
}

export interface StaffMenuSection {
  title: string;
  items: StaffMenuItem[];
}

export const STAFF_MENU: StaffMenuSection[] = [
  {
    title: '',
    items: [
      { path: '', label: 'Tableau de bord', icon: 'fa-tachometer-alt' },
      { path: 'messages', label: 'Boîte de réception', icon: 'fa-inbox', sprint: 'S5' },
    ],
  },
  {
    title: 'Guichet',
    items: [
      { path: 'citoyens', label: 'Citoyens', icon: 'fa-user', abilities: ['citizens.search'] },
      { path: 'declarations', label: 'Déclarations de perte', icon: 'fa-file-alt', abilities: ['declarations.view'] },
      { path: 'documents', label: 'Documents trouvés', icon: 'fa-id-card', abilities: ['found_documents.view'] },
      { path: 'correspondances', label: 'Correspondances', icon: 'fa-link', abilities: ['matches.view'] },
      { path: 'retraits', label: 'Retraits', icon: 'fa-people-arrows', abilities: ['collections.view'] },
      { path: 'restitutions', label: 'Restitutions', icon: 'fa-handshake', abilities: ['restitutions.view'] },
      { path: 'frais', label: 'Frais', icon: 'fa-coins', abilities: ['billing.view', 'billing.collect'] },
    ],
  },
  {
    title: 'Pilotage',
    items: [
      { path: 'statistiques', label: 'Statistiques et délais', icon: 'fa-chart-line', abilities: ['stats.view'], sprint: 'S5' },
      { path: 'vigilance', label: 'Vigilance', icon: 'fa-shield-alt', abilities: ['vigilance.view'], sprint: 'S5' },
      { path: 'rapports', label: 'Rapports', icon: 'fa-file-invoice', abilities: ['stats.view'], sprint: 'S5' },
      { path: 'membres', label: 'Membres', icon: 'fa-users', abilities: ['members.view'], sprint: 'S5' },
      { path: 'structures', label: 'Structures', icon: 'fa-sitemap', abilities: ['organizations.create_child'], sprint: 'S5' },
    ],
  },
];

/** Toutes les entrées « à venir » (routes provisoires). */
export const STAFF_UPCOMING = STAFF_MENU.flatMap((s) => s.items).filter((i) => i.path && i.sprint);
