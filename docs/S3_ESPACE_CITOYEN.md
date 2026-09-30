# Sprint S3 : espace citoyen et pages publiques

## Nouveaux écrans
| Adresse | Pour qui | Contenu | API |
|---|---|---|---|
| `/mon-espace/declarations` | citoyen | Mes déclarations + documents retrouvés et **marche à suivre** (se présenter à la structure / demander la remise directe / récupération en cours / restitué), certificat PDF | `GET /api/my-declarations` (enrichie), `POST /api/documents/{uuid}/restitution` |
| `/mon-espace/restitutions` | propriétaire et trouveur | Remises directes en double accord : accepter / refuser (trouveur), suivre / retirer (propriétaire), numéro affiché seulement après accord | `/api/restitution-requests/*` |
| `/mon-espace/trouvailles` | trouveur | Documents publiés + suivi de la récupération par la structure (appel, rendez-vous, remis) | `GET /api/my-publications`, `GET /api/documents/{uuid}/collection` |
| `/mon-espace/qr` | citoyen | Créer, afficher, **imprimer**, renouveler, désactiver les QR codes des pièces | `/api/document-tags/*` |
| `/mon-espace/paiements` | citoyen | Frais (gratuits pendant le pilote) et paiement **Wave** | `GET /api/my-charges`, `POST /api/charges/{uuid}/checkout` |
| `/publier` (refait) | trouveur connecté | **Photo → lecture OCR → formulaire pré-rempli** (champs surlignés à vérifier), alertes de lecture, aperçu masqué, lieu + GPS + département, accord pour être contacté par la structure la plus proche | `POST /api/v2/ocr/scan`, `POST /api/documents` (+ `ocr_scan_id`) |
| `/t/:token` | toute personne qui scanne un QR (sans compte) | Signaler le document trouvé : numéro, lieu/GPS, accords | `GET/POST /api/v2/tags/{token}` |
| `/verifier` et `/verifier/:code` | banques, administrations | Certificat de perte ou décharge : authentique / révoqué, initiales seulement | `GET /api/v2/verify/{code}` |
| `/paiement/succes`, `/paiement/echec` | citoyen | Retour de Wave | — |

Menus : « Mon espace » dans le menu utilisateur du site public (ordinateur et mobile) ; « Espace structures » dans le menu de l'admin.

## Détails utiles
- **Photos réduites avant l'envoi** (≈ 2000 px, JPEG) : une photo de téléphone de 5 Mo passe à ~400 Ko → envoi rapide sur réseau mobile.
- **Lecture OCR indisponible** (service non branché, réponse 503) : la personne remplit le formulaire à la main, la photo est envoyée normalement.
- **Scan expiré** (plus de 60 min) : la photo est renvoyée automatiquement.
- Numéros sénégalais contrôlés (`77 123 45 67`, `+221…`) ; noms avec accents, apostrophes et traits d'union acceptés (l'ancien formulaire refusait « Aïssatou » ou « N'Diaye »).
- Les types de documents viennent maintenant de l'API (fini la liste écrite en dur).
- Nouveau fichier de styles communs : `src/styles/doctrack-v2.css` (couleurs DocTrack, cartes, encadrés, onglets, impression des QR).

## Modification de l'API (AI-sendocAPI)
`GET /api/my-declarations` renvoie, pour chaque déclaration, `found_documents` : documents retrouvés (correspondances confirmées)
avec `next_step` (`counter` | `direct` | `wait` | `done`), la structure qui garde la pièce et l'éventuelle demande de remise.
Aucune donnée du trouveur. Test ajouté : `RestitutionRequestFlowTest::test_my_declarations_show_the_found_document_and_the_next_step`.

Fichiers : `app/Http/Controllers/DeclarationDePerteController.php`, `tests/Feature/Matching/RestitutionRequestFlowTest.php`.

## Tests
- Front : `npx ng test --watch=false` → 38 tests (validateurs, CitizenApi, écran des déclarations, + S2).
- API : `php artisan test --filter=RestitutionRequestFlowTest` → 14 tests.

## Réglage API à vérifier
`FRONTEND_URL` dans le `.env` de l'API doit pointer vers l'adresse du front : elle sert aux liens des QR codes (`/t/…`),
aux e-mails (« Demander la restitution ») et aux retours de paiement Wave (`/paiement/succes`).

## À tester de ton côté
- [ ] Citoyen : Mon espace → les 5 onglets s'affichent
- [ ] Publier avec une photo (spécimen `tests/Fixtures/ocr/cni_recto.jpg` de l'API) : sans service OCR → message « remplissez à la main »
- [ ] Déclarer une perte puis publier la même pièce avec un autre compte → la déclaration montre « trouvée par un citoyen » → Demander la restitution → le trouveur voit la demande dans « Remises »
- [ ] Créer un QR, l'afficher, l'imprimer ; ouvrir le lien `/t/…` dans une fenêtre privée et signaler le document
- [ ] `/verifier/<numéro d'un certificat>`

Puis commit dans les deux dépôts :
```powershell
# AI-sendocFront
git add -A ; git commit -m "S3 : espace citoyen, publication avec OCR, pages publiques QR et vérification"
# AI-sendocAPI
git add -A ; git commit -m "my-declarations : documents retrouvés et marche à suivre"
```
