import { Injectable, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { CitizenApi } from '../../core/api/citizen.api';

/** Compteurs affichés sur les onglets : demandes auxquelles répondre, frais à régler. */
@Injectable({ providedIn: 'root' })
export class CitizenBadges {
  private readonly api = inject(CitizenApi);

  readonly restitutionsToAnswer = signal(0);
  readonly chargesToPay = signal(0);

  refresh(): void {
    forkJoin({
      requests: this.api.restitutionRequests().pipe(catchError(() => of([]))),
      charges: this.api.myCharges().pipe(catchError(() => of([]))),
    }).subscribe(({ requests, charges }) => {
      this.restitutionsToAnswer.set(requests.filter((r) => r.my_role === 'finder' && r.status === 'pending').length);
      this.chargesToPay.set(charges.filter((c) => c.status === 'pending').length);
    });
  }
}
