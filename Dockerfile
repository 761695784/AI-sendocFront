# ── Étape 1 : construction ─────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build

# ── Étape 2 : exécution (rendu serveur Angular) ────────
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=build /app/dist/doc-track-front ./dist/doc-track-front
EXPOSE 4000
CMD ["node", "dist/doc-track-front/server/server.mjs"]
