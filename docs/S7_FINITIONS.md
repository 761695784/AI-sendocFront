# Sprint S7 : finitions (application installable, accessibilité, performances, tests de parcours, déploiement)

## 1. Application installable (PWA)
- **Icônes DocTrack** (72 à 512 px + icônes « maskable » pour Android + icône Apple) à la place des icônes Angular par défaut.
- **Manifeste** en français : nom, couleurs, et **raccourcis** (appui long sur l'icône) : Déclarer une perte, Publier un document trouvé,
  Mon espace, Vérifier un certificat (les anciens raccourcis pointaient vers des pages qui n'existent plus).
- **Service worker** (`ngsw-config.json`) :
  - l'application, les polices et les icônes (Font Awesome, Poppins) sont gardées en cache → **les pages s'ouvrent sans réseau** (vérifié : `/apropos` hors connexion) ;
  - seuls les **référentiels publics** (types de documents, départements) sont mis en cache côté API, 7 jours au plus ;
    **aucune donnée personnelle** (déclarations, citoyens, pièces) n'est stockée par le service worker.
- **Bandeaux** en bas de l'écran (`shared/pwa/`) : « Pas de connexion internet », « Nouvelle version prête → Mettre à jour »,
  « Installer DocTrack sur cet appareil » (Chrome / Android). Vérification d'une nouvelle version toutes les 6 h pour les guichets qui restent ouverts.

## 2. Performances
| | Avant | Après |
|---|---|---|
| Paquet initial (transféré) | 351 Ko | **171 Ko** |
| `main.js` | 923 Ko | **129 Ko** |

- La **carte** de l'accueil (bibliothèque MapLibre, ~800 Ko) ne se charge que lorsqu'elle arrive à l'écran (`@defer (on viewport)`).
- **Toutes les pages sauf l'accueil** sont chargées à la demande (connexion, inscription, liste, déclarer…).
- **Hydratation** : l'accueil et la liste, rendus par le serveur, ne sont plus redessinés entièrement par le navigateur ;
  les clics faits pendant le chargement sont rejoués. Aucune erreur d'hydratation constatée.
- Serveur Node (`server.ts`) : fichiers avec empreinte en cache 1 an ; **service worker, manifeste et pages revalidés à chaque visite**
  (avant, tout était en cache 1 an : un utilisateur pouvait rester bloqué sur une ancienne version).

## 3. Accessibilité et mobile
- `lang="fr"`, **titre de page** sur chaque route (lu par les lecteurs d'écran, affiché dans l'onglet).
- **Lien « Aller au contenu »** (touche Tab) et zone principale `<main>` dans les espaces citoyen, structure et admin.
- Contour visible au clavier, animations réduites si le système le demande, boutons plus hauts sur écran tactile.
- **Contrastes** : gris trop clairs des anciens écrans remplacés (128 occurrences), boutons et onglets Bootstrap foncés (norme WCAG AA).
- Icônes porteuses de sens annoncées correctement ; le graphique des statistiques n'imbrique plus de boutons dans une image.
- **Contrôle automatique axe-core** (WCAG 2 A/AA) sur 13 pages : **0 problème grave** (restent seulement les grands numéros décoratifs
  « 01 / 02 » de l'accueil, masqués aux lecteurs d'écran).
- **Mobile (390 px)** : aucune page ne déborde horizontalement.
- **Page « introuvable »** (404) au lieu d'une page blanche.

## 4. Nettoyage
- **Publicités Google AdSense retirées** de `index.html` : une plateforme qui manipule des pièces d'identité et travaille avec la Police
  et la Gendarmerie ne doit pas afficher de publicité ni charger de traceurs publicitaires (commentaire laissé pour les remettre si besoin).
  Google Analytics est conservé.
- Routes inutiles retirées : `/navbar`, `/statistiques`, `/restitution`, `/publication-types`, `/email-activity` (graphiques V1 isolés).
- Composants plus utilisés retirés : `adminrapport`, `codevalidation`, `googleauth`, `publishform`, `sideheaders`, `sidebar`, service `rapport.service`.
- Dépendance inutilisée retirée : `bootstrap-icons`.
- `/found-qr` est **conservé** : les anciens QR codes imprimés y renvoient.

## 5. Tests
- Unitaires : `npx ng test --watch=false` → **64 tests** (dont l'application installable).
- **Tests de parcours (Playwright)** dans `e2e/`, sur ordinateur **et** téléphone (Pixel 7), avec une API simulée (données fictives) :
  pages publiques (accueil, 404, vérification d'un certificat, manifeste), accès protégés, droits agent / responsable,
  boîte de réception → retrait, statistiques en tableau, validation d'une synthèse IA (seules les corrections sont envoyées),
  anciens écrans admin dans la nouvelle mise en page → **24 tests verts**.

```powershell
npm install
npx playwright install chromium     # une seule fois
npm run e2e                         # lance ng serve puis les tests
npx playwright show-report          # rapport détaillé (captures en cas d'échec)
```

## 6. Déploiement
Voir `docs/DEPLOIEMENT.md` (Netlify statique ou Docker avec rendu serveur).

## À supprimer de ton côté (je n'ai pas le droit de supprimer des fichiers sur ton PC)
```powershell
cd "C:\Users\HP\Desktop\UNIPODS AI INNOVATION\AI-sendocFront\src\app\components"
Remove-Item -Recurse adminrapport, codevalidation, googleauth, publishform, sideheaders, sidebar
Remove-Item services\rapport.service.ts
```
Puis :
```powershell
cd "C:\Users\HP\Desktop\UNIPODS AI INNOVATION\AI-sendocFront"
npm install
npx ng test --watch=false
npm run e2e
git add -A ; git commit -m "S7 : finitions (PWA, accessibilité, performances, tests de parcours, déploiement)"
```
