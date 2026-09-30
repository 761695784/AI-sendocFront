# Sprint S5 : le pilotage (responsables et institutions)

Écrans de l'espace des structures (`/espace/...`) pour suivre l'activité, les délais et la vigilance.
Chaque entrée du menu n'apparaît que si la structure active donne le droit correspondant
(voir `config/doctrack_access.php` de l'API). Les statistiques et rapports portent sur la **structure active**
et toute sa descendance quand on est administrateur d'institution.

## Écrans
| Adresse | Droit | Rôle de l'écran | API V2 |
|---|---|---|---|
| `messages` | tous | Boîte de réception : rappels de délai, nouveaux retraits, correspondances, rapports ; un clic ouvre l'écran concerné et marque le message lu ; « tout marquer comme lu » ; pastille du menu mise à jour aussitôt | `GET /inbox`, `/inbox/{uuid}/read`, `/inbox/read-all`, `/inbox/unread-count` |
| `statistiques` | stats.view | Période (7 j, 30 j, 3 mois, 12 mois, autre) ; **délais de réaction** comparés aux objectifs (SLA) ; à traiter maintenant ; activité ; **graphique d'évolution** (6 indicateurs, par jour/semaine/mois, infobulle, vue tableau) ; retraits en retard ; **comparaison des structures** + export Excel/CSV | `GET /stats/overview`, `/stats/timeseries`, `/stats/overdue-collections`, `/stats/structures(?format=csv)` |
| `vigilance`, `vigilance/:uuid` | vigilance.view (+ vigilance.review pour trancher) | Alertes à traiter / confirmées / écartées, filtre par niveau avec compteurs ; fiche : message, détails, lien vers le document ou la déclaration ; **Confirmer / Écarter avec motif obligatoire** | `GET /vigilance/alerts`, `/{uuid}`, `POST /confirm`, `/dismiss` |
| `rapports`, `rapports/:uuid` | stats.view | Générer un rapport (un mois, une année, une période) ; liste avec niveau et score ; PDF et Excel ; fiche : synthèse chiffrée, points d'attention, points positifs, recommandations, synthèse rédigée par l'IA **seulement après validation** du super admin | `GET/POST /reports`, `/reports/{uuid}`, `/pdf`, `/xlsx` |
| `membres` (`?organisation=uuid`) | members.view (+ members.manage) | Membres de la structure active (ou d'une sous-structure depuis l'écran Structures) ; ajout avec **invitation par email** ; rôle, matricule, fonction ; **fin d'affectation** (historique conservé) ; anciennes affectations | `GET/POST /organizations/{uuid}/members`, `PATCH /memberships/{uuid}`, `/end` |
| `structures` | organizations.create_child | Arbre institution → directions → structures ; créer une sous-structure (type, département, **position GPS** utilisée pour attribuer les retraits) ; modifier ; désactiver / réactiver ; accès aux membres | `GET/POST /organizations`, `PATCH /organizations/{uuid}`, `/activate`, `/deactivate`, `/organization-types`, `/territories` |
| `envois` | audit.view | Suivi des SMS / emails / messages (preuve de qui a été prévenu) ; **relance d'un SMS en échec** | `GET /notification-deliveries`, `/summary`, `POST /{uuid}/retry` |

Rôles attribuables (règles de l'API) : un responsable de structure ajoute des **agents** ; un administrateur d'institution
ajoute des administrateurs (institution ou direction), des responsables (structure) et des agents.

## Fichiers ajoutés
- `core/api/pilot.api.ts` + `pilot.types.ts` : toutes les routes du pilotage ; `inboxRoute()` traduit les liens des messages
  (`collections/…` → `/espace/retraits/…`, `matches/…` → `/espace/correspondances/…`, `reports/…` → `/espace/rapports/…`).
- `ApiV2Client.patch()`.
- `features/staff/shared/inbox-badge.service.ts` : compteur de non-lus partagé (barre du haut + boîte de réception).
- `features/staff/stats/column-chart.component.ts` : histogramme léger sans bibliothèque (colonnes ≤ 24 px, grille discrète,
  infobulle souris/clavier, bascule « Voir en tableau » pour l'accessibilité).
- `features/staff/{messages,stats,vigilance,reports,members,structures,deliveries}/`.

## Tests
`npx ng test --watch=false` → 54 tests (10 nouveaux : appels du pilotage, liens des messages, rôles attribuables,
types créables, périodes et axe du graphique, alertes et niveaux de rapport).

## Scénario de démo (vidéo)
1. Compte **administrateur d'institution** → **Structures** → « Sous-structure » → créer « Commissariat de Pikine » avec « Utiliser ma position actuelle ».
2. Cliquer sur le nombre de membres → **Ajouter un membre** (responsable) → il reçoit l'email d'invitation.
3. **Statistiques et délais** → 30 jours → montrer les délais comparés aux objectifs, le graphique, les retraits en retard, puis **Exporter**.
4. **Vigilance** → alerte « Photo réutilisée » → ouvrir le document → **Écarter** ou **Confirmer** avec le motif.
5. **Rapports** → Générer le mois dernier → ouvrir → **PDF**.
6. **Boîte de réception** → cliquer un rappel → on arrive sur le retrait concerné, la pastille diminue.

## À faire de ton côté
```powershell
npx ng test --watch=false
npx ng serve
```
Tester avec un compte responsable de structure (statistiques, vigilance, membres) puis un administrateur d'institution
(structures, comparaison des structures), puis :
`git add -A ; git commit -m "S5 : écrans de pilotage"`.
