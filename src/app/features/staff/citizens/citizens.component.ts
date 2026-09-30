import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CitizenProfile } from '../../../core/api/counter.types';
import { SessionStore } from '../../../core/session/session.store';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CitizenPickerComponent } from '../shared/citizen-picker.component';

/** Accueil d'un citoyen au guichet : le retrouver (ou l'enregistrer), puis enregistrer sa déclaration. */
@Component({
  selector: 'app-staff-citizens',
  imports: [DatePipe, PageHeaderComponent, CitizenPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Citoyens" subtitle="Retrouvez la personne avant toute démarche, pour ne pas créer de doublon." />
    <div class="row g-3">
      <div class="col-lg-7">
        <div class="dt-card"><app-citizen-picker (picked)="selected.set($event)" /></div>
      </div>
      <div class="col-lg-5">
        @if (selected(); as c) {
          <div class="dt-card">
            <h2 class="dt-card__title">{{ c.first_name }} {{ c.last_name }}</h2>
            <p class="dt-card__meta">
              @if (c.birth_date) { Né(e) le {{ c.birth_date | date: 'd MMMM y' }} · }{{ c.phone_masked }}
            </p>
            @if (c.has_account) {
              <p class="small dt-muted">Cette personne a un compte DocTrack : elle suivra sa déclaration dans son espace.</p>
            }
            @if (canDeclare()) {
              <button type="button" class="btn btn-dt mt-2" (click)="declare(c)"><i class="fas fa-file-alt me-1" aria-hidden="true"></i> Déclarer une perte</button>
            }
          </div>
        } @else {
          <div class="dt-card dt-muted small">
            <p class="mb-2"><b>Au guichet :</b></p>
            <ol class="mb-0 ps-3">
              <li>Recherchez la personne par téléphone (le plus rapide) ou par identité.</li>
              <li>Si elle est inconnue, enregistrez-la.</li>
              <li>Enregistrez sa déclaration : le certificat est délivré aussitôt.</li>
            </ol>
          </div>
        }
      </div>
    </div>
  `,
})
export class StaffCitizensComponent {
  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);
  readonly selected = signal<CitizenProfile | null>(null);

  canDeclare(): boolean {
    return this.session.can('declarations.create');
  }

  declare(c: CitizenProfile): void {
    this.router.navigate(['/espace/declarations/nouvelle'], { state: { citizen: c } });
  }
}
