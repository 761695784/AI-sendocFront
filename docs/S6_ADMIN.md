# Sprint S6 : l'espace super admin

L'ancienne administration (`/admin`, menu violet, écrans V1) est remplacée par un **espace super admin** qui a la même
présentation que l'espace des structures, avec un **périmètre national**. Tout l'espace est chargé à la demande :
le code de l'administration n'est plus téléchargé par les citoyens.

## Menu
| Section | Écran | Adresse | Nouveauté |
|---|---|---|---|
| — | **Accueil** | `/admin` | « À traiter » : synthèses IA à valider, alertes de vigilance hautes, retraits sans structure, SMS en échec ; chiffres nationaux des 30 derniers jours |
| — | Boîte de réception | `/admin/messages` | écran S5 partagé |
| Pilotage national | Statistiques et délais | `/admin/statistiques` | écran S5, **toujours national** (donnée de route `national`) + comparaison de toutes les structures |
| | Vigilance | `/admin/vigilance` | toutes les alertes, y compris celles sans structure (comptes citoyens, publications en ligne) |
| | **Rapports et synthèses IA** | `/admin/rapports` | onglet **« Synthèses IA à valider »** ; sur la fiche, panneau de **validation** : corriger le texte, les faits marquants et les recommandations, **valider et envoyer**, **rejeter** (motif), **rédiger à nouveau** ; tentatives des modèles (réussite / échec et raison) ; suppression d'un rapport |
| | Suivi des envois | `/admin/envois` | écran S5 partagé, tous les envois |
| Organisation | Structures | `/admin/structures` | + **Nouvelle institution** (racine), désactivées visibles, activer/désactiver partout |
| | **Types de structure** | `/admin/types-structure` | créer (code proposé depuis le nom), renommer, supprimer ; classés par niveau (institution, échelon intermédiaire, structure) |
| | **Tarifs et reversements** | `/admin/facturation` | mode pilote / payant expliqué ; tarif de chaque service (part autorités / DocTrack), **modifier** (national ou propre à une institution, date d'effet, motif), **historique** ; **rapport de reversement** par mois et par institution + export Excel/CSV |
| Contenus et comptes | Publications, Déclarations en ligne, Certificats, Utilisateurs, Statistiques (historique), Journal d'activités, Sauvegardes, Mon profil | mêmes adresses qu'avant (`/admin/adminpub`…) | **écrans V1 conservés**, affichés dans la nouvelle mise en page (l'ancien menu `app-sideheaders` est retiré de ces écrans) |

- L'ancien écran « Rapports » V1 (`/admin/adminrapport`) redirige vers les rapports V2.
- L'ancien tableau de bord V1 reste accessible à `/admin/activite` (hors menu).
- Les composants `sidebar`, `sideheaders` et `adminrapport` ne sont plus utilisés : ils pourront être supprimés en S7.

## Écrans partagés entre les deux espaces
Les écrans du S5 servent aux deux espaces. `features/staff/shared/space-base.ts` indique l'espace courant (`/admin` ou `/espace`)
pour que les liens « Retour », fiches de rapport ou d'alerte restent dans le même espace.
Les liens vers le guichet (retraits, documents, déclarations) ouvrent l'espace des structures, accessible au super admin.

## API
- Nouveau filtre `GET /api/v2/reports?narrative_status=pending` (file de validation des synthèses IA) + test
  (`ReportNarrativeTest::test_pending_narratives_can_be_listed_for_review`) + spec OpenAPI. 305 tests verts.
- Rappel : aucune clé d'IA n'est configurée → les synthèses restent « Aucune » ; le panneau l'explique et propose « Lancer la rédaction ».

## Fichiers
- `core/api/admin.api.ts` + `admin.types.ts` (+ `narrative_status` dans `PilotApi.reports`).
- `features/admin/` : `admin.routes.ts`, `admin-menu.ts`, `shell/`, `home/`, `narrative-review/`, `organization-types/`, `billing/`.
- `styles/doctrack-v2.css` : neutralisation des marges des écrans V1 dans la nouvelle mise en page.

## Tests
`npx ng test --watch=false` → 61 tests (7 nouveaux : appels admin, file de validation, envoi des seules corrections, code proposé, montants FCFA).

## À faire de ton côté
```powershell
# API
php artisan test --filter=ReportNarrativeTest
# Front
npx ng test --watch=false
npx ng serve
```
Se connecter en **super admin** → `/admin` : faire le tour du menu, ouvrir un écran V1 (Publications, Utilisateurs) pour vérifier la mise en page,
créer un type de structure, modifier un tarif avec une date d'effet future, afficher le rapport de reversement du mois dernier.
Puis :
`git add -A ; git commit -m "S6 : espace super admin"` (dans le front) et `git add -A ; git commit -m "reports: filtre narrative_status"` (dans l'API).
