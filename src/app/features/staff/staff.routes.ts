import { Routes } from '@angular/router';
import { abilityGuard } from '../../core/guards/access.guards';
import { StaffShellComponent } from './shell/staff-shell.component';
import { StaffHomeComponent } from './home/staff-home.component';
import { ComingSoonComponent } from './coming-soon/coming-soon.component';
import { STAFF_UPCOMING } from './staff-menu';

/**
 * Espace des structures (/espace/...). Protégé par staffGuard (app.routes.ts) ;
 * chaque écran vérifie en plus le droit correspondant de la structure active.
 * Les écrans des sprints S4-S5 remplaceront les pages provisoires.
 */
export const STAFF_ROUTES: Routes = [
  {
    path: '',
    component: StaffShellComponent,
    children: [
      { path: '', component: StaffHomeComponent, title: 'Espace structure — DocTrack' },
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
