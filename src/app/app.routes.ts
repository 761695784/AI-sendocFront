import { Routes } from '@angular/router';
import { authGuard, superAdminGuard, staffGuard } from './core/guards/access.guards';
import { LandingComponent } from './components/landing/landing.component';

/**
 * Routes de l'application. Seule la page d'accueil est dans le paquet initial ;
 * toutes les autres pages sont chargées à la demande (premier affichage plus rapide sur mobile).
 * Chaque page a un titre (lu par les lecteurs d'écran et affiché dans l'onglet).
 */
export const routes: Routes = [
  { path: '', component: LandingComponent, title: 'DocTrack — documents perdus et retrouvés au Sénégal' },
  { path: 'accueil', component: LandingComponent, title: 'DocTrack — documents perdus et retrouvés au Sénégal' },
  { path: 'connexion', title: 'Connexion — DocTrack', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'inscription', title: 'Créer un compte — DocTrack', loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent) },
  { path: 'liste', title: 'Documents retrouvés — DocTrack', loadComponent: () => import('./components/document-list/document-list.component').then(m => m.DocumentListComponent) },
  { path: 'apropos', title: 'À propos — DocTrack', loadComponent: () => import('./components/a-propos/a-propos.component').then(m => m.AProposComponent) },
  { path: 'reset', title: 'Mot de passe oublié — DocTrack', loadComponent: () => import('./components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'newpass', title: 'Nouveau mot de passe — DocTrack', loadComponent: () => import('./components/newpass/newpass.component').then(m => m.NewpassComponent) },
  { path: 'private-policy', title: 'Confidentialité — DocTrack', loadComponent: () => import('./components/private-policy/private-policy.component').then(m => m.PrivatePolicyComponent) },
  // Anciens QR codes imprimés (V1) : conservés pour que les codes déjà distribués fonctionnent toujours.
  { path: 'found-qr', title: 'Document trouvé — DocTrack', loadComponent: () => import('./components/found-qr/found-qr.component').then(m => m.FoundQrComponent) },

  // Routes avec Authentification pour un user simple
  // Publier un document trouvé (avec lecture automatique de la pièce)
  {
    path: 'publier',
    canActivate: [authGuard],
    title: 'Publier un document trouvé — DocTrack',
    loadComponent: () => import('./features/citizen/publish/publish-found.component').then(m => m.PublishFoundComponent)
  },
  { path: 'document/:uuid', canActivate: [authGuard], title: 'Document — DocTrack', loadComponent: () => import('./components/document-detail/document-detail.component').then(m => m.DocumentDetailComponent) },
  // Déclaration en ligne (V2) : récépissé DocTrack ; le certificat de perte est délivré au guichet.
  { path: 'declarer', canActivate: [authGuard], title: 'Déclarer une perte — DocTrack', loadComponent: () => import('./features/citizen/declare/declare-loss.component').then(m => m.DeclareLossComponent) },
  { path: 'lost', canActivate: [authGuard], title: 'Mes déclarations — DocTrack', loadComponent: () => import('./components/lostdeclaration/lostdeclaration.component').then(m => m.LostdeclarationComponent) },
  { path: 'mypub', canActivate: [authGuard], title: 'Mes publications — DocTrack', loadComponent: () => import('./components/mypublish/mypublish.component').then(m => m.MypublishComponent) },
  { path: 'modify', canActivate: [authGuard], title: 'Mon profil — DocTrack', loadComponent: () => import('./components/changeprofil/changeprofil.component').then(m => m.ChangeprofilComponent) },
  { path: 'code', canActivate: [authGuard], title: 'Mon QR code — DocTrack', loadComponent: () => import('./components/qrcode/qrcode.component').then(m => m.QrcodeComponent) },

  // Espace super admin (V2 + écrans historiques) — chargé à la demande
  {
    path: 'admin',
    canActivate: [superAdminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },

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
    title: 'Carte — DocTrack',
    loadComponent: () => import('./components/map/map.component').then(m => m.MapComponent)
  },

  // Adresse inconnue : page « introuvable » (au lieu d'une page blanche)
  {
    path: '**',
    title: 'Page introuvable — DocTrack',
    loadComponent: () => import('./features/public/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
