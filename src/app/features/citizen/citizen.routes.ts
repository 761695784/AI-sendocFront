import { Routes } from '@angular/router';
import { CitizenShellComponent } from './shell/citizen-shell.component';

/** Espace citoyen (/mon-espace/...), protégé par authGuard dans app.routes.ts. */
export const CITIZEN_ROUTES: Routes = [
  {
    path: '',
    component: CitizenShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'declarations' },
      {
        path: 'declarations',
        title: 'Mes déclarations — DocTrack',
        loadComponent: () => import('./declarations/my-declarations.component').then((m) => m.MyDeclarationsComponent),
      },
      {
        path: 'restitutions',
        title: 'Remises de documents — DocTrack',
        loadComponent: () => import('./restitutions/my-restitutions.component').then((m) => m.MyRestitutionsComponent),
      },
      {
        path: 'trouvailles',
        title: 'Documents que j’ai trouvés — DocTrack',
        loadComponent: () => import('./publications/my-finds.component').then((m) => m.MyFindsComponent),
      },
      {
        path: 'qr',
        title: 'Mes QR codes — DocTrack',
        loadComponent: () => import('./qr/my-qr-codes.component').then((m) => m.MyQrCodesComponent),
      },
      {
        path: 'paiements',
        title: 'Mes paiements — DocTrack',
        loadComponent: () => import('./payments/my-payments.component').then((m) => m.MyPaymentsComponent),
      },
    ],
  },
];
