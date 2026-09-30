/**
 * Configuration de DÉVELOPPEMENT (utilisée par `ng serve`).
 * L'API tourne en local : `php artisan serve` dans AI-sendocAPI.
 * Pour travailler contre l'API en ligne, remplacer par les adresses de environment.ts.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  imageUrl: 'http://localhost:8000',
};
