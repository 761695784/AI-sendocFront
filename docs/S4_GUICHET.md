# Sprint S4 : le guichet (agents et responsables de structure)

Tous les écrans sont dans l'espace des structures (`/espace/...`) et n'apparaissent que si la structure active
donne le droit correspondant (voir `config/doctrack_access.php` de l'API).

## Écrans
| Adresse | Droit | Rôle de l'écran | API V2 |
|---|---|---|---|
| `citoyens` | citizens.search | Retrouver une personne (téléphone, ou nom + prénom + naissance) ou l'enregistrer ; doublon signalé | `GET/POST /citizens` |
| `declarations` | declarations.view | Liste filtrable (référence, statut) | `GET /declarations` |
| `declarations/nouvelle` | declarations.create | Déclaration en 3 étapes : personne, **jusqu'à 10 pièces**, circonstances | `POST /declarations` |
| `declarations/:uuid` | declarations.view | Pièces et statuts, **certificat à imprimer** (PDF), frais, annulation motivée | `GET /declarations/{uuid}`, `/certificate`, `/cancel` |
| `documents` | found_documents.view | Documents en garde (✓ = propriétaire identifié) | `GET /found-documents` |
| `documents/depot` | found_documents.create | **Dépôt avec photo lue automatiquement**, lieu, trouveur (SMS de remerciement) | `POST /ocr/scan`, `POST /found-documents` |
| `documents/:uuid` | found_documents.view | Photo d'origine (interne), identité, garde, correspondances, bouton **Restituer** | `GET /found-documents/{uuid}` |
| `documents/:uuid/restituer` | restitutions.perform | **Restitution officielle** : pièce d'identité photographiée (OCR), titulaire ou **procuration**, contrôles, **dérogations motivées** (nom différent, alerte de vigilance), décharge à imprimer puis décharge signée à joindre | `GET/POST /found-documents/{uuid}/restitution`, `/restitutions/{uuid}/discharge`, `/signed-scan` |
| `correspondances` | matches.view | File « à examiner / confirmées / rejetées », meilleur score d'abord | `GET /matches` |
| `correspondances/:uuid` | matches.view (+ matches.review pour décider) | **Comparaison côte à côte** + explication du score critère par critère ; confirmer (propriétaire prévenu) ou rejeter (motif) | `GET /matches/{uuid}`, `/confirm`, `/reject` |
| `retraits` | collections.view | Documents à récupérer chez les trouveurs, prioritaires (★) d'abord | `GET /collections` |
| `retraits/:uuid` | collections.view (+ collections.manage) | Numéro du trouveur (bouton d'appel, consultation tracée), résultat de l'appel, **rendez-vous** (dépôt ou passage d'un agent), document reçu, refus (→ structure suivante) ou transfert, historique, lieu sur la carte | `/collections/{uuid}/contact`, `/plan`, `/collected`, `/decline`, `/transfer` |
| `restitutions` et `restitutions/:uuid` | restitutions.view | Registre des décharges (⚠ = décharge signée manquante), décharge PDF, pièce jointe, **annulation (responsable, 72 h)** | `GET /restitutions`, `/void` |
| `frais` | billing.view ou billing.collect | À encaisser : **espèces (monnaie calculée)**, **lien Wave**, exonération motivée (responsable) | `/charges/{uuid}/cash`, `/checkout`, `/exempt` |

## Composants réutilisables ajoutés
- `shared/photo-scan` : photo + lecture OCR + alertes, utilisé pour le dépôt et les pièces d'identité.
- `features/staff/shared/citizen-picker` : recherche / création d'une personne sans doublon.
- `features/staff/shared/charge-actions` : règlement d'un frais (espèces, Wave, exonération).
- `core/api/counter.api.ts` + `counter.types.ts` : toutes les routes du guichet.

## Dérogations à la restitution
L'API refuse la remise (erreur 422) quand le nom de la pièce présentée diffère trop du nom inscrit sur le document
(seuil `doctrack.restitution.name_threshold`, 0,85) ou quand une **alerte de vigilance haute** est ouverte.
L'écran affiche alors le message et un champ « motif » : seul un **responsable** peut valider (l'API le vérifie).

## Tests
`npx ng test --watch=false` → 44 tests (dont appels du guichet et scénario de restitution avec dérogation).

## Scénario de démo (vidéo)
1. **Citoyens** → rechercher Awa par téléphone → inconnue → l'enregistrer → **Déclarer une perte** (CNI + permis) → imprimer le certificat.
2. Autre agent / autre structure : **Documents trouvés → Enregistrer un dépôt** → photo du spécimen `cni_recto.jpg` → champs remplis → enregistrer.
3. Même numéro → correspondance confirmée automatiquement (sinon **Correspondances** → comparer → Confirmer).
4. Fiche du document → **Restituer** → photographier la pièce d'Awa → cocher le contrôle → enregistrer → imprimer la décharge → joindre la décharge signée.
5. Côté citoyen : **Mon espace** → la déclaration passe « Restitué ».

Pour les **retraits** : un citoyen publie un document en acceptant d'être contacté (S3) → la structure la plus proche le voit dans **Retraits**.

## À faire de ton côté
```powershell
npx ng test --watch=false
npx ng serve
```
Tester avec un compte agent puis un compte responsable (les boutons diffèrent selon les droits), puis :
`git add -A ; git commit -m "S4 : écrans du guichet"`.
