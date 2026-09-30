import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Fichiers statiques (JS, CSS, images) servis depuis /browser, mis en cache 1 an.
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
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
