# Sprints S0 + S1 : correctif des rôles et montée de version Angular 17.3 → 22.2

## Ce qui a changé

### S0 : correctif des rôles
- `src/app/core/auth/roles.ts` (nouveau) : reconnaît le super admin par `super_admin` **ou** l'ancien nom `Admin`,
  sous forme de texte (`response.roles`) ou d'objet (`response.user.roles`).
- Connexion (`login.component.ts`, `auth.service.ts`) : la session enregistre aussi `roles` et `organizations` (structures des agents).
- Vérification de l'e-mail : l'API renvoie `access_token` (et non `token`) → le jeton est maintenant bien enregistré.
- Garde (`auth.guard.ts`) : utilise les rôles enregistrés. Déconnexion : efface `roles` et `organizations`.

### S1 : montée de version
| Élément | Avant | Après |
|---|---|---|
| Angular | 17.3 | **22.2** |
| ng-bootstrap | 16 | 21 |
| TypeScript | 5.4 | 6.0 |
| zone.js | 0.14 | 0.15 |
| Node.js requis | 18/20 | **24** (22.22+ minimum) |
| Outil de build | `@angular-devkit/build-angular` | `@angular/build` |

- **Syntaxe des gabarits** : `*ngIf` / `*ngFor` → `@if` / `@for` (migration automatique d'Angular, 30 gabarits).
- `standalone: true` retiré (implicite depuis Angular 19).
- **Rendu serveur (SSR)** : nouveau `server.ts` (`AngularNodeAppEngine`) + `src/app/app.routes.server.ts` qui choisit le mode page par page :
  - prérendu au build : à propos, confidentialité, connexion, inscription, mot de passe oublié ;
  - rendu serveur à chaque visite : accueil, liste, fiche document ;
  - navigateur uniquement : espace admin, formulaires connectés, carte, QR.
- **Sécurité SSR** : `angular.json` → `security.allowedHosts` (doctrack.majeliconnect.com, localhost).
  Ajouter ici tout nouveau nom de domaine, sinon le serveur répond « 400 Bad Request ».
- **Nettoyage** :
  - dépendances inutilisées retirées : laravel-echo, pusher-js, mapbox-gl, cropperjs, @auth0/angular-jwt, @techiediaries/ngx-qrcode,
    @nguniversal/express-engine, jquery, popper.js, @googlemaps/google-maps-services-js, ldrs (npm), @types/fabric, @angular/animations ;
  - `index.html` : Bootstrap **4** (CSS + JS), jQuery et le CSS mapbox, chargés **en plus** de Bootstrap 5, ont été retirés ;
  - `angular.json` : plus de scripts jQuery/Bootstrap JS (les menus déroulants passent par ng-bootstrap).
- `Dockerfile` : Node 24, construction puis lancement du serveur SSR (port **4000**) au lieu de `ng serve`.
- `npm run serve:ssr` (renommé) lance le serveur de production après `ng build`.

## À faire de ton côté

```powershell
cd "C:\Users\HP\Desktop\UNIPODS AI INNOVATION\AI-sendocFront"
Remove-Item -Recurse -Force node_modules, .angular
npm install
npx ng serve            # développement : http://localhost:4200
npx ng build            # production
npm run serve:ssr       # teste la version production : http://localhost:4000
```

Puis parcourir la liste de contrôle et faire le commit :
```powershell
git checkout -b v2-upgrade
git add -A
git commit -m "S0-S1 : rôles V2 + Angular 22"
```

## Liste de contrôle
- [ ] Accueil (dernières publications), liste, fiche d'un document
- [ ] Connexion **citoyen** → accueil ; connexion **admin** → /admin (c'était cassé)
- [ ] Inscription + code reçu par e-mail ; mot de passe oublié
- [ ] Publier un document (avec photo), déclarer une perte, mes publications, mes déclarations, QR
- [ ] Admin : publications, déclarations, certificats, utilisateurs, statistiques + graphiques, rapports, journaux, sauvegardes
- [ ] Menus déroulants de l'en-tête admin (notifications, profil)
- [ ] Carte
- [ ] Aspect visuel identique (Bootstrap 4 retiré : signaler toute différence)

## Reporté
- Tests : passage de Karma à **Vitest** (sprint S7, avec de vrais tests).
- Hydratation SSR (`provideClientHydration`) : à activer après vérification des pages (S2).
- Le script Google AdSense est toujours dans `index.html` : à retirer si la plateforme devient officielle.
