import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaBarComponent } from './shared/pwa/pwa-bar.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, PwaBarComponent],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'DocTrackFront';
}
