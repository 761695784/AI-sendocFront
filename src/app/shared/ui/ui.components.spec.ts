import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StatusBadgeComponent, statusLabel } from './status-badge.component';
import { PaginatorComponent } from './paginator.component';

@Component({
  imports: [StatusBadgeComponent, PaginatorComponent],
  template: `
    <app-status-badge [status]="status()" />
    <app-paginator [page]="page()" (pageChange)="asked = $event" />
  `,
})
class HostComponent {
  status = signal<string | null>('in_custody');
  page = signal({ current_page: 2, last_page: 3, total: 41 });
  asked = 0;
}

describe('Composants partagés', () => {
  it('statut traduit et coloré', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const badge: HTMLElement = fixture.nativeElement.querySelector('.dt-badge');
    expect(badge.textContent?.trim()).toBe('En garde');
    expect(badge.className).toContain('dt-badge--primary');

    fixture.componentInstance.status.set('statut_inconnu');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(badge.textContent?.trim()).toBe('statut_inconnu');
    expect(statusLabel(null)).toBe('—');
  });

  it('pagination : page suivante', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const text = fixture.nativeElement.querySelector('.dt-paginator span').textContent;
    expect(text).toContain('Page 2 / 3');
    expect(text).toContain('41 résultats');

    const [, next] = fixture.nativeElement.querySelectorAll('.dt-paginator button');
    next.click();
    expect(fixture.componentInstance.asked).toBe(3);
  });
});
