# DocTrack — Frontend V2 : analyse et plan de travail

> Projet : `AI-sendocFront` (Angular) · API : `AI-sendocAPI` (Laravel 12, V1 `/api/*` + V2 `/api/v2/*`)
> Rédigé le 30/09/2026 — à valider avant toute modification du code.

---

## 1. État des lieux

| Élément | Constat |
|---|---|
| Version | Angular **17.3** (composants standalone, SSR `@angular/ssr`, prérendu, service worker) |
| Taille | 41 composants, 12 services, ~5 500 lignes TS |
| Templates | ancienne syntaxe : 149 `*ngIf`, 29 `*ngFor` |
| Appels API | **uniquement V1**. Le jeton est ajouté **à la main** dans chaque service (pas d'intercepteur) |
| Adresse API | codée en dur (`apiUrl.ts` → `https://doctrack.majeliconnect.com/api`), pas de fichiers `environments` |
| Stockage | `localStorage` lu directement dans plusieurs services (ex. `declaration.service`) → plante au rendu serveur (SSR) |
| Rôles | test `role.name === 'Admin'` (login, garde, liste des utilisateurs) ; aucune notion de structure (commissariat/brigade) |
| Garde | une seule classe `AuthGuard` (ancien style), admin ou non |
| Dépendances inutilisées | `laravel-echo`, `pusher-js`, `mapbox-gl`, `cropperjs`, `@auth0/angular-jwt`, `@techiediaries/ngx-qrcode`, `@nguniversal/express-engine` (obsolète) ; **jQuery** et `bootstrap.js` chargés mais jamais utilisés dans le code |
| Utilisées | bootstrap 5 (CSS), ng-bootstrap 16, chart.js, sweetalert2 (99 appels), maplibre-gl, ngx-pagination, ldrs |
| Tests | fichiers Karma générés, pas de vrais tests |
| Docker | `node:20.9.0` + CLI 17.3, `npm install --force` |
| i18n | `assets/i18n/fr.json` présent mais non branché |

### ⚠️ Bogue actuel (à corriger en premier)

Depuis la migration `rename_legacy_roles` de l'API, les rôles s'appellent `super_admin` / `citizen`.
Le front lit `response.user.roles[].name === 'Admin'` → **l'administrateur n'est plus reconnu** : il est envoyé vers l'accueil et la garde lui refuse `/admin`.
L'API renvoie pourtant déjà la bonne information : `response.roles` (liste de textes, avec l'alias `Admin` conservé) et `response.organizations`.
**Correctif** : lire `response.roles` au lieu de `response.user.roles` (login, garde). 3 lignes, faisable immédiatement.

### Bonne nouvelle

Toutes les routes V1 appelées par le front **existent toujours** dans l'API. Le front actuel peut donc continuer à tourner pendant la migration :
on **ajoute** les écrans V2 et on **remplace** progressivement, sans « grand saut ».

---

## 2. Montée de version : Angular 17.3 → **22.2** (dernière version stable)

Vérifié sur npm le 30/09/2026 : `latest = 22.2.0` (20.x et 21.x encore maintenues en LTS).

### Prérequis
- **Node.js 24 LTS** (Angular 22 exige Node `^22.22.3` ou `^24.15`) — sur ton PC **et** dans le `Dockerfile`.
- TypeScript **6.0** (installé automatiquement par `ng update`).
- Branche Git dédiée : `git checkout -b v2-upgrade`.

### Étapes (une version majeure à la fois, jamais de saut direct)

| Étape | Commande | Points d'attention |
|---|---|---|
| 17 → 18 | `ng update @angular/core@18 @angular/cli@18` | retirer `@nguniversal/express-engine` ; `ng-bootstrap@17` |
| 18 → 19 | `ng update @angular/core@19 @angular/cli@19` | `standalone: true` devient implicite (retiré automatiquement) ; nouveau `server.ts` (`AngularNodeAppEngine`) ; `ng-bootstrap@18` |
| 19 → 20 | `ng update @angular/core@20 @angular/cli@20` | `zone.js 0.15` ; `ng-bootstrap@19` |
| 20 → 21 | `ng update @angular/core@21 @angular/cli@21` | `ng-bootstrap@20` |
| 21 → 22 | `ng update @angular/core@22 @angular/cli@22` | TypeScript 6 ; `ng-bootstrap@21` |

Après **chaque** étape : `ng build` + `ng serve` + tour rapide des écrans (liste de contrôle en annexe) + commit.

### Migrations automatiques à passer (après la v22)
```bash
ng generate @angular/core:control-flow      # *ngIf / *ngFor → @if / @for
ng generate @angular/core:inject            # constructeurs → inject()
ng generate @angular/core:signal-input-migration
ng generate @angular/core:output-migration
ng generate @angular/core:self-closing-tag
```

### Nettoyage
- `npm uninstall laravel-echo pusher-js mapbox-gl cropperjs @auth0/angular-jwt @techiediaries/ngx-qrcode @nguniversal/express-engine jquery`
- Retirer jQuery / popper / `bootstrap.min.js` de `angular.json` (ng-bootstrap fait déjà le travail).
- SSR : fichier `app.routes.server.ts` avec un mode de rendu **par route** :
  pages publiques = prérendu, fiche document / QR public = rendu serveur, espaces connectés = navigateur uniquement.
- Tests : Karma est abandonné → **Vitest** (standard d'Angular 21+).
- Plus tard (facultatif) : mode **zoneless** (sans zone.js), plus léger et plus rapide.

> Méthode : je fais la montée de version **dans l'espace cloud** (Node 24, build et tests vérifiés à chaque étape), puis j'écris les fichiers dans ton dossier.
> Tu n'auras qu'à faire `npm install` puis `ng serve` et vérifier.

---

## 3. Architecture cible

```
src/app/
  core/                  ← une seule fois pour toute l'appli
    api/                 types générés depuis docs/api/doctrack-v2.openapi.yaml
    http/                intercepteurs : jeton JWT, en-tête X-Organization, erreurs (401 → login, 403, 422), chargement
    session/             SessionStore (signals) : user, roles, organizations, structure active
    guards/              authGuard, superAdminGuard, orgRoleGuard('agent' | 'structure_manager' | 'institution_admin')
  shared/                composants réutilisables : tableau paginé, carte statut, badge, lecteur PDF, capture photo, upload
  features/
    public/              accueil, liste, détail, à propos, QR public, vérification certificat
    citizen/             mon espace citoyen
    counter/             guichet (agents)
    structure/           responsables de structure
    institution/         Police / Gendarmerie (niveau national)
    admin/               super admin
  environments/          environment.ts / environment.development.ts (apiUrl, imageUrl)
```

- **Une seule application**, chaque espace chargé à la demande (`loadChildren`) → le citoyen ne télécharge pas le code du guichet.
- **Sélecteur de structure** dans l'en-tête pour un agent rattaché à plusieurs structures (alimente `X-Organization`).
- Menus construits d'après les rôles de la session (fini les menus codés en dur).
- Types TypeScript générés depuis la spec OpenAPI (`openapi-typescript`) → le front suit l'API automatiquement.

---

## 4. Services existants à réadapter

| Service actuel | Action |
|---|---|
| `apiUrl.ts`, `imageUrl.ts` | → `environments` (local / production) |
| `auth.service` | garder login/register/reset ; stocker `roles` + `organizations` ; `me` alimente le SessionStore ; supprimer les en-têtes manuels ; déconnexion + `refresh` du jeton |
| tous les services | **supprimer** `getAuthHeaders()` / `localStorage.getItem('token')` → intercepteur |
| `auth.guard` | → gardes fonctionnelles basées sur les rôles (`super_admin`, rôles de structure) |
| `publications.service` | publication avec `ocr_scan_id` (après scan) ; photo masquée côté public |
| `declaration.service` | déclaration en ligne inchangée (V1) ; certificats ; + suivi des correspondances |
| `rapport.service` | → `/api/v2/reports` (liste, PDF, Excel, génération, synthèse IA) ; stats → `/api/v2/stats/*` |
| `found-qr.service` | → remplacé par les **étiquettes QR** (`/api/document-tags`, page publique `/api/v2/tags/{token}`) |
| `details.service` | restitution directe → `restitution-requests` (double accord) |
| `auth.service` (notifications) | → boîte de réception V2 `/api/v2/inbox` (compteur non lus) |
| `backup`, `commentaire`, `doc-type` | inchangés (juste l'intercepteur) |
| `user-add`, `userget` | rôles V2 ; les agents se créent **par structure** (`organizations/{uuid}/members`) |

---

## 5. Nouveaux écrans

Légende : **P1** = nécessaire pour la démo du programme · P2 = pilote · P3 = confort.

### 5.1 Public (sans compte)
| Écran | API | Prio |
|---|---|---|
| Page QR d'un document trouvé `/t/:token` (signaler l'avoir trouvé) | `GET/POST /v2/tags/{token}` | P1 |
| Vérification d'un certificat de perte `/verifier/:code` | `GET /v2/verify/{code}` | P2 |

### 5.2 Citoyen
| Écran | API | Prio |
|---|---|---|
| **Scan OCR** d'une pièce trouvée : photo → formulaire pré-rempli → aperçu masqué → publier | `POST /v2/ocr/scan`, `GET /v2/ocr/scans/{id}/preview`, `POST /documents` | P1 |
| **Assistant** (fenêtre flottante : texte, micro, audio wolof, cartes d'action « oui/non ») | `/v2/assistant/*` | P2 *(en pause côté IA)* |
| Mes correspondances / suivi de ma déclaration | V1 declarations + matches | P1 |
| Restitution directe : demandes reçues/envoyées, accepter/refuser | `/restitution-requests/*` | P1 |
| Mes étiquettes QR (créer, renouveler, révoquer, imprimer) | `/document-tags/*` | P2 |
| Retrait au guichet : où, quand, quoi apporter | collections (vue citoyen) | P1 |
| Paiement Wave : lancer, page de retour succès/échec | `charges/{id}/checkout` | P2 |

### 5.3 Guichet — agent de structure
| Écran | API | Prio |
|---|---|---|
| Tableau de bord du guichet (à traiter aujourd'hui) | `/v2/stats/overview`, `/v2/inbox` | P1 |
| Recherche / création d'un citoyen | `/v2/citizens` | P1 |
| Déclaration au guichet + certificat PDF | `/v2/declarations`, `…/certificate` | P1 |
| Dépôt d'un document trouvé **avec scan OCR** | `/v2/found-documents` + OCR | P1 |
| Documents en garde (prise en charge) | `…/take-custody` | P1 |
| **File des correspondances** : comparer, confirmer, rejeter (score affiché) | `/v2/matches/*` | P1 |
| Retraits : contacter, planifier, transférer, remis, refusé | `/v2/collections/*` | P1 |
| **Restitution officielle** : scan de la pièce du demandeur, procuration, décharge signée | `/v2/found-documents/{id}/restitution`, `/v2/restitutions/*` | P1 |
| Frais : encaisser en espèces, exonérer, Wave | `/v2/charges/*` | P2 |

### 5.4 Responsable de structure / institution
| Écran | API | Prio |
|---|---|---|
| Membres de la structure (ajouter, retirer) | `organizations/{id}/members`, `memberships/{id}/end` | P1 |
| Arborescence des structures (institution → région → commissariat) | `/v2/organizations`, `territories` | P2 |
| Statistiques et délais (SLA), retraits en retard | `/v2/stats/*` | P1 |
| **Alertes de vigilance** (doublons, fraude) : écarter / confirmer | `/v2/vigilance/alerts/*` | P1 |
| Rapports : liste, PDF, Excel | `/v2/reports/*` | P2 |
| Boîte de réception | `/v2/inbox/*` | P1 |
| Suivi des SMS/e-mails envoyés, relance | `/v2/notification-deliveries/*` | P3 |

### 5.5 Super admin
| Écran | API | Prio |
|---|---|---|
| Structures et types de structure | `/v2/organizations`, `organization-types` | P1 |
| **Validation de la synthèse IA des rapports** (lire, corriger, approuver, rejeter, régénérer) | `/v2/reports/{id}/narrative/*` | P2 |
| Tarifs et rapport de facturation | `/v2/billing/*` | P3 |
| Écrans admin existants (publications, déclarations, utilisateurs, journaux, sauvegardes) | V1 | adapter |

**Total : ~30 nouveaux écrans**, ~12 écrans existants à adapter.

---

## 6. Méthode de travail

1. **Tout le projet dans le cloud** : je récupère le dossier complet (sauf `node_modules`, `dist`, `.angular`) dans un dépôt Git de travail.
2. **Un sprint = un lot cohérent** ; à la fin de chaque sprint : `ng build` sans erreur, tests verts, liste des fichiers modifiés.
3. **J'écris les fichiers dans ton dossier** ; **tu** fais `npm install` (si `package.json` a changé), `ng serve`, tu vérifies, puis **tu commits**.
4. L'API tourne en local (`php artisan serve`) avec `environment.development.ts` pointant sur `http://localhost:8000/api`.
5. Données de test **fictives uniquement** (spécimens OCR, citoyens inventés).
6. Si tu modifies un fichier de ton côté pendant un sprint, dis-le moi : je relis la version de ton dossier avant d'écrire (protection contre l'écrasement).

### Calendrier proposé (≈ 9 semaines, fin avant Wadhwani le 17/12)

| Sprint | Contenu | Durée |
|---|---|---|
| **S0** | Correctif des rôles, installation Node 24, branche Git, récupération du projet complet | 1 j |
| **S1** | Montée de version 17 → 22, nettoyage des dépendances, SSR par route, Docker | 4 j |
| **S2** | Fondations : environments, intercepteurs, SessionStore, gardes, sélecteur de structure, mises en page par espace, types OpenAPI, composants partagés | 1 sem |
| **S3** | Citoyen : scan OCR, correspondances, restitution directe, retraits, page QR publique | 1,5 sem |
| **S4** | Guichet : citoyens, déclaration, dépôt + scan, garde, correspondances, retraits, restitution officielle | 2 sem |
| **S5** | Responsables : membres, stats/SLA, vigilance, boîte de réception, rapports | 1 sem |
| **S6** | Super admin : structures, validation IA des rapports, facturation ; adaptation des écrans admin V1 | 1 sem |
| **S7** | Finitions : PWA, accessibilité, mobile, performances, tests de parcours (Playwright), déploiement | 1 sem |

La **démo vidéo** peut être tournée dès la fin de S4 (parcours complet : déclaration → dépôt scanné → correspondance → restitution).

---

## Annexe — liste de contrôle après chaque étape de montée de version

Accueil · connexion (citoyen **et** admin) · inscription + code · mot de passe oublié · liste + détail d'un document · publier (avec photo) ·
déclarer · mes publications · mes déclarations · QR · espace admin (publications, déclarations, certificats, utilisateurs, stats + graphiques, rapports, journaux, sauvegardes) · carte · rendu serveur (`npm run serve:ssr`).
