// app.config.ts
import { ApplicationConfig, LOCALE_ID, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { organizationInterceptor } from './core/http/organization.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

// Dates et nombres au format français (1 234,5 · 30 sept. 2026).
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    // Détection des changements via zone.js (comportement historique de l'application).
    provideZoneChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    // Jeton, structure active et erreurs communes ajoutés à chaque appel de l'API.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, organizationInterceptor, errorInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr' },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
