# Sprint S2 : fondations du frontend V2

## En bref
Tout ce que les écrans des sprints suivants vont réutiliser : configuration par environnement, session unique,
ajout automatique du jeton et de la structure active, gardes par rôle et par droit, espace « structures »,
types générés depuis l'API, composants communs et tests.

## Nouveaux dossiers
```
src/environments/                 environment.ts (production) · environment.development.ts (ng serve)
src/app/core/
  storage/browser-storage.ts      localStorage sûr (rendu serveur, navigation privée)
  auth/roles.ts · jwt.ts          rôles V1/V2, lecture de l'expiration du jeton
  session/session.store.ts        SESSION UNIQUE (signals) : jeton, profil, rôles, structures, structure active, droits
  http/*.interceptor.ts           jeton · X-Organization · erreurs 401/403
  guards/access.guards.ts         authGuard · superAdminGuard · staffGuard · abilityGuard('droit')
  api/schema.d.ts                 types GÉNÉRÉS depuis la spec OpenAPI de l'API (npm run api:types)
  api/api.types.ts                alias lisibles : Declaration, Match, Collection, Page<T>…
  api/api-v2.client.ts            ApiV2Client (get/post/delete/blob) + toFormData, saveBlob, apiErrorMessage
src/app/shared/
  ui/                             app-page-header · app-status-badge · app-loading · app-empty-state · app-error-state · app-paginator
  feedback/notify.service.ts      messages SweetAlert2 homogènes (success, error, confirm, confirmWithNote)
  org-switcher/                   choix de la structure active (agent rattaché à plusieurs structures)
src/app/features/staff/           ESPACE STRUCTURES /espace (menu selon les droits, tableau de bord, pages « à venir »)
```

## Ce qui change pour l'utilisateur
| Profil | Après connexion | Nouveauté |
|---|---|---|
| Citoyen | /accueil (ou la page demandée) | inchangé |
| Agent / responsable / institution | **/espace** | menu selon ses droits, sélecteur de structure, messages non lus, chiffres clés (responsables) |
| Super admin | /admin | lien « Espace structure » s'il est aussi rattaché à une structure |

- Session expirée → retour à la connexion avec le message « Session expirée », puis retour à la page demandée.
- Le jeton est **renouvelé automatiquement** 10 minutes avant son expiration (API : `POST /api/refresh`).
- Déconnexion : le jeton est aussi invalidé côté API (`POST /api/logout`).
- Dates et nombres au format français (`LOCALE_ID = fr`).
- Menu du site public : liens « Espace structure » / « Administration » selon le profil.

## Services existants nettoyés
Les 8 services V1 n'ajoutent plus le jeton à la main (`getHeaders()`, `localStorage.getItem('token')` supprimés) :
l'intercepteur s'en charge. Mêmes méthodes, mêmes signatures : aucun écran existant n'a eu à changer.
`AuthService` s'appuie sur `SessionStore` ; `apiUrl.ts` et `imageUrl.ts` lisent `environment`.

## ⚠️ Développement : l'API locale par défaut
`ng serve` utilise maintenant **http://localhost:8000/api** (`environment.development.ts`).
Lancer l'API avant : `php artisan serve` dans AI-sendocAPI.
Pour travailler contre l'API en ligne, remplacer les deux adresses de `environment.development.ts` par celles de `environment.ts`.
`ng build` (production) utilise toujours https://doctrack.majeliconnect.com/api.

## Tests (Vitest)
```powershell
npx ng test --watch=false     # 31 tests : session, intercepteurs, gardes, outils API, composants
```
Karma et Jasmine sont retirés. Les anciens fichiers `*.spec.ts` générés par la CLI (dans `src/app/components/`,
`src/app/guards/` et `src/app/app.component.spec.ts`) ne sont plus exécutés : tu peux les supprimer.
```powershell
Get-ChildItem src\app\components, src\app\guards -Recurse -Filter *.spec.ts | Remove-Item
Remove-Item src\app\app.component.spec.ts
```

## Types de l'API
Après une modification de l'API (nouvelle route, nouveau champ) : `npm run api:types`
(lit `../AI-sendocAPI/docs/api/doctrack-v2.openapi.yaml`). Le compilateur signale ensuite les écrans à adapter.

## À faire de ton côté
```powershell
npm install
npx ng test --watch=false
npx ng serve
```
Vérifier :
- [ ] Connexion citoyen → accueil ; connexion admin → /admin
- [ ] Connexion d'un **agent** (compte créé via l'API V2 dans une structure) → /espace, menu limité à ses droits
- [ ] Agent rattaché à 2 structures : le sélecteur change la structure et le menu
- [ ] Déconnexion depuis l'espace et depuis le site public
- [ ] Écrans V1 (publier, déclarer, admin…) toujours fonctionnels

Puis : `git add -A` et `git commit -m "S2 : fondations frontend V2"`.
