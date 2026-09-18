import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-private-policy',
  standalone: true,
  imports: [NavbarComponent,FooterComponent],
  templateUrl: './private-policy.component.html',
  styleUrl: './private-policy.component.css'
})
export class PrivatePolicyComponent {

}
