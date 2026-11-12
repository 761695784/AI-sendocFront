import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-pilot-footer',
  imports: [TranslatePipe],
  templateUrl: './pilot-footer.component.html',
  styleUrl: './pilot-footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PilotFooterComponent {
  readonly email = input.required<string>();
  readonly phone = input.required<string>();
  readonly whatsappUrl = input.required<string>();
}
