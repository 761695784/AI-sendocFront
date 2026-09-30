import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
    selector: 'app-a-propos',
    imports: [NavbarComponent, FooterComponent,],
    templateUrl: './a-propos.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './a-propos.component.css'
})
export class AProposComponent {

}
