import { FoundQrComponent } from './components/found-qr/found-qr.component';
import { Routes } from '@angular/router';
import { authGuard, superAdminGuard, staffGuard } from './core/guards/access.guards';
import { LandingComponent } from './components/landing/landing.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DocumentListComponent } from './components/document-list/document-list.component';
import { DocumentDetailComponent } from './components/document-detail/document-detail.component';
import { DeclarationformComponent } from './components/declarationform/declarationform.component';
import { LostdeclarationComponent } from './components/lostdeclaration/lostdeclaration.component';
import { MypublishComponent } from './components/mypublish/mypublish.component';
import { ChangeprofilComponent } from './components/changeprofil/changeprofil.component';
import { EvolutionChartComponent } from './components/evolution-chart/evolution-chart.component';
import { RestitutionChartComponent } from './components/restitution-chart/restitution-chart.component';
import { PublicationTypeChartComponent } from './components/publication-type-chart/publication-type-chart.component';
import { EmailActivityChartComponent } from './components/email-activity-chart/email-activity-chart.component';
import { AProposComponent } from './components/a-propos/a-propos.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { NewpassComponent } from './components/newpass/newpass.component';
import { PrivatePolicyComponent } from './components/private-policy/private-policy.component';
import { QrcodeComponent } from './components/qrcode/qrcode.component';


export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'navbar', component: NavbarComponent },
  { path: 'accueil', component: LandingComponent },
  { path: 'connexion', component: LoginComponent },
  { path: 'inscription', component: RegisterComponent },
  { path: 'liste', component: DocumentListComponent },
  { path: 'apropos', component: AProposComponent},
  { path: 'reset',component: ResetPasswordComponent},
  { path: 'newpass', component: NewpassComponent },
  { path: 'private-policy', component: PrivatePolicyComponent },
  { path: 'found-qr', component: FoundQrComponent },



  // Routes avec Authentification pour un user simple
  // Publier un document trouvé (avec lecture automatique de la pièce)
  {
    path: 'publier',
    canActivate: [authGuard],
    title: 'Publier un document trouvé — DocTrack',
    loadComponent: () => import('./features/citizen/publish/publish-found.component').then(m => m.PublishFoundComponent)
  },
  { path: 'document/:uuid', component: DocumentDetailComponent, canActivate: [authGuard] },
  { path: 'declarer', component: DeclarationformComponent, canActivate: [authGuard] },
  { path: 'lost', component: LostdeclarationComponent, canActivate: [authGuard] },
  { path: 'mypub', component: MypublishComponent, canActivate: [authGuard] },
  { path: 'modify', component: ChangeprofilComponent, canActivate: [authGuard] },
  { path: 'code', component: QrcodeComponent,canActivate: [authGuard] },

  // Espace super admin (V2 + écrans historiques) — chargé à la demande
  {
    path: 'admin',
    canActivate: [superAdminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },

  // Routes pour les differents diagrammes
  { path: 'statistiques', component: EvolutionChartComponent, canActivate: [authGuard] },
  { path: 'restitution', component: RestitutionChartComponent, canActivate: [authGuard] },
  { path: 'publication-types', component: PublicationTypeChartComponent, canActivate: [authGuard] },
  { path: 'email-activity', component: EmailActivityChartComponent, canActivate: [authGuard] },

  // Espace citoyen : déclarations, remises, documents trouvés, QR codes, paiements
  {
    path: 'mon-espace',
    canActivate: [authGuard],
    loadChildren: () => import('./features/citizen/citizen.routes').then(m => m.CITIZEN_ROUTES)
  },

  // Pages publiques V2 (sans compte)
  {
    path: 't/:token',
    title: 'Document trouvé — DocTrack',
    loadComponent: () => import('./features/public/tag-found/tag-found.component').then(m => m.TagFoundComponent)
  },
  {
    path: 'verifier',
    title: 'Vérifier un certificat — DocTrack',
    loadComponent: () => import('./features/public/verify/verify.component').then(m => m.VerifyComponent)
  },
  {
    path: 'verifier/:code',
    title: 'Vérifier un certificat — DocTrack',
    loadComponent: () => import('./features/public/verify/verify.component').then(m => m.VerifyComponent)
  },
  {
    path: 'paiement/succes',
    data: { outcome: 'success' },
    loadComponent: () => import('./features/public/payment-return/payment-return.component').then(m => m.PaymentReturnComponent)
  },
  {
    path: 'paiement/echec',
    data: { outcome: 'error' },
    loadComponent: () => import('./features/public/payment-return/payment-return.component').then(m => m.PaymentReturnComponent)
  },

  // Espace des structures (agents, responsables, institutions) — chargé à la demande
  {
    path: 'espace',
    canActivate: [staffGuard],
    loadChildren: () => import('./features/staff/staff.routes').then(m => m.STAFF_ROUTES)
  },

  // Lazy Loading pour la carte
  {
    path: 'map',
    loadComponent: () => import('./components/map/map.component').then(m => m.MapComponent)
  }
];
