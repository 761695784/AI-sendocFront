import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaBarComponent } from './shared/pwa/pwa-bar.component';
import { SeoService } from './core/seo/seo.service';
import { AssistantWidgetComponent } from './shared/assistant/assistant-widget.component';
import { I18nService } from './core/i18n/i18n.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, PwaBarComponent, AssistantWidgetComponent],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'DocTrackFront';

  constructor() {
    // Description, robots, adresse canonique et aperçus de partage mis à jour à chaque page.
    inject(SeoService).init();
    // Langue du site (français, anglais, portugais) : choix mémorisé ou langue du téléphone.
    inject(I18nService).init();
  }
}
