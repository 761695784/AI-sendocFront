# DocTrack — interface web (Angular 22, rendu serveur)
# Construction :  docker build -t doctrack-front .
# Lancement    :  docker run -d -p 4000:4000 -e NG_ALLOWED_HOSTS=app.mondomaine.sn doctrack-front

# ── Étape 1 : construction ─────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build

# ── Étape 2 : exécution (rendu serveur Angular) ────────
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000
# Domaines supplémentaires autorisés pour le rendu serveur (séparés par des virgules), en plus de ceux d'angular.json.
ENV NG_ALLOWED_HOSTS=""
COPY --from=build --chown=node:node /app/dist/doc-track-front ./dist/doc-track-front
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/healthz || exit 1
CMD ["node", "dist/doc-track-front/server/server.mjs"]
