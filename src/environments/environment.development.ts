/**
 * Configuration de DÉVELOPPEMENT (utilisée par `ng serve`).
 * L'API tourne en local : `php artisan serve --host=0.0.0.0` dans AI-sendocAPI.
 * L'API est appelée sur la même machine que la page : `localhost` sur le PC,
 * l'adresse du PC (ex. 192.168.1.20) quand on teste depuis un téléphone du même Wi-Fi.
 * Pour travailler contre l'API en ligne, remplacer par les adresses de environment.ts.
 */
const host = typeof location !== 'undefined' && location.hostname ? location.hostname : 'localhost';

export const environment = {
  production: false,
  apiUrl: `http://${host}:8000/api`,
  imageUrl: `http://${host}:8000`,
  /** Adresse publique du site, utilisée pour les adresses canoniques (identique en développement). */
  siteUrl: 'https://sendoctrack-ai.netlify.app',
};
