import { ChangeDetectionStrategy, Component, HostListener, output, signal } from '@angular/core';
import { LanguageSwitcherComponent } from '../../core/i18n/language-switcher.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-pilot-navbar',
  imports: [LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './pilot-navbar.component.html',
  styleUrl: './pilot-navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PilotNavbarComponent {
  readonly menuOpen = signal(false);
  readonly demoRequested = output<void>();
  readonly sectionRequested = output<string>();

  readonly sections = [
    { id: 'fonctionnement', label: 'pilot.nav_workflow' },
    { id: 'benefices', label: 'pilot.nav_benefits' },
    { id: 'securite', label: 'pilot.nav_security' },
    { id: 'mvp', label: 'pilot.nav_mvp' },
    { id: 'pilote', label: 'pilot.nav_program' },
    { id: 'equipe', label: 'pilot.nav_team' }
  ] as const;

  navigate(event: MouseEvent, id: string): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.closeMenu();
    this.sectionRequested.emit(id);
  }

  @HostListener('keydown.escape')
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  requestDemo(): void {
    this.closeMenu();
    this.demoRequested.emit();
  }
}
