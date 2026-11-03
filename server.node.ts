/**
 * Serveur Node (Express) de DocTrack — utilisé pour l'hébergement Docker / VPS.
 * Construit avec : npx ng build --configuration production,docker
 * (Netlify utilise server.ts, au format imposé par @netlify/angular-runtime.)
 */
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { basename, join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
// Noms de domaine autorisés : angular.json (security.allowedHosts) + variable NG_ALLOWED_HOSTS (ex. « app.doctrack.sn »).
const angularApp = new AngularNodeAppEngine();

app.disable('x-powered-by');

/**
 * En-têtes de sécurité sur toutes les réponses : pas d'affichage dans un cadre d'un autre site,
 * pas de devinette de type de fichier, adresse d'origine limitée, caméra et position réservées au site lui-même
 * (photo des pièces et localisation des documents trouvés).
 */
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=(self), payment=()');
  next();
});

/** Sonde de santé pour Docker / l'hébergeur. */
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Fichiers statiques depuis /browser.
 * - fichiers dont le nom contient une empreinte (main-AB12CD34.js…) : en cache 1 an, ils ne changent jamais ;
 * - le reste (service worker, ngsw.json, manifeste, pages HTML, images sans empreinte) : revalidé à chaque visite,
 *   sinon les utilisateurs resteraient bloqués sur une ancienne version de l'application.
 */
const HASHED = /-[A-Za-z0-9_]{8}\.(js|mjs|css)$/;
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      const name = basename(path);
      if (HASHED.test(name)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (name.startsWith('ngsw') || name.endsWith('.html') || name.endsWith('.webmanifest') || name === 'safety-worker.js' || name === 'worker-basic.min.js') {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  }),
);

/**
 * Toutes les autres requêtes : rendu par Angular (mode choisi route par route
 * dans src/app/app.routes.server.ts).
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Démarrage du serveur quand ce fichier est lancé directement
 * (node dist/doc-track-front/server/server.mjs), port 4000 par défaut.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error?: unknown) => {
    if (error) {
      throw error;
    }
    console.log(`Serveur DocTrack démarré sur http://localhost:${port}`);
  });
}

/**
 * Gestionnaire utilisé par la CLI (ng serve) et les hébergeurs serverless.
 */
export const reqHandler = createNodeRequestHandler(app);
