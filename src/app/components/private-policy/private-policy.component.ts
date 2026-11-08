import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
    selector: 'app-private-policy',
    imports: [TranslatePipe, NavbarComponent, FooterComponent],
    templateUrl: './private-policy.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './private-policy.component.css'
})
export class PrivatePolicyComponent {

}
