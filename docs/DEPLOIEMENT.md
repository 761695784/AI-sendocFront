# Mettre DocTrack en ligne (interface web)

L'interface appelle l'API définie dans `src/environments/environment.ts` :
`https://doctrack.majeliconnect.com/api` (production). Vérifier cette adresse avant chaque mise en ligne.

## Option A — Netlify (hébergement statique, le plus simple)
Le site actuel (`sendoctrack.netlify.app`) peut continuer ainsi. `netlify.toml` contient tout :
- construction `npx ng build`, dossier publié `dist/doc-track-front/browser` ;
- toute adresse renvoie vers l'application (routage dans le navigateur) ;
- cache long pour les fichiers avec empreinte, revalidation pour le service worker et les pages ;
- en-têtes de sécurité.

Étapes : relier le dépôt Git à Netlify (ou `npx netlify deploy --prod --dir=dist/doc-track-front/browser` après un `npx ng build`).
Limite : pas de rendu serveur → l'accueil est moins bien référencé par Google qu'avec l'option B.

## Option B — Docker (rendu serveur, sur le même serveur que l'API)
```bash
docker build -t doctrack-front .
docker run -d --name doctrack-front --restart unless-stopped -p 4000:4000 \
  -e NG_ALLOWED_HOSTS=app.doctrack.sn doctrack-front
curl http://localhost:4000/healthz      # {"status":"ok"}
```
- `NG_ALLOWED_HOSTS` : nom(s) de domaine du site, séparés par des virgules. Sans cela, le rendu serveur refuse
  les domaines inconnus (protection contre une faille). Les domaines `doctrack.majeliconnect.com`, `localhost` sont déjà autorisés dans `angular.json`.
- Le conteneur tourne avec un utilisateur sans privilèges et se surveille lui-même (`HEALTHCHECK`).

Exemple de configuration Nginx devant le conteneur (HTTPS avec Certbot) :
```nginx
server {
    server_name app.doctrack.sn;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    gzip on;
    gzip_types text/css application/javascript application/json application/manifest+json image/svg+xml;
}
```

## Côté API (Laravel) — à vérifier à chaque nouveau domaine
- `FRONTEND_URL` dans le `.env` de l'API = adresse du site (liens des emails, retours de paiement Wave, QR codes).
- Les appels viennent d'un autre domaine que l'API : l'API doit accepter ce domaine (CORS). Par défaut Laravel accepte tous les domaines ;
  pour restreindre, publier `config/cors.php` (`php artisan config:publish cors`) et mettre le domaine du site dans `allowed_origins`.

## Après chaque mise en ligne
1. Ouvrir le site, se connecter (citoyen, agent, admin).
2. Le bandeau « Nouvelle version prête » apparaît chez ceux qui avaient l'ancienne version : cliquer « Mettre à jour ».
3. Sur Android / Chrome : menu ⋮ → « Installer l'application » (ou le bandeau « Installer DocTrack »).
4. Contrôle rapide hors connexion : couper le réseau, recharger « À propos » → la page s'affiche avec le bandeau « Pas de connexion ».
