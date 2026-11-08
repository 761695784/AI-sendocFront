import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
    selector: 'app-footer',
    imports: [TranslatePipe],
    templateUrl: './footer.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './footer.component.css'
})
export class FooterComponent {

}
