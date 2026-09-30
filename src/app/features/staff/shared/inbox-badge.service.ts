import { Injectable, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { PilotApi } from '../../../core/api/pilot.api';

/**
 * Nombre de messages non lus (pastille du menu), partagé entre la barre du haut
 * et la boîte de réception : lire un message met la pastille à jour tout de suite.
 */
@Injectable({ providedIn: 'root' })
export class InboxBadgeService {
  private readonly api = inject(PilotApi);
  private readonly _unread = signal(0);
  readonly unread = this._unread.asReadonly();

  refresh(): void {
    this.api
      .unreadCount()
      .pipe(catchError(() => of({ unread: 0 })))
      .subscribe((res) => this._unread.set(res.unread ?? 0));
  }

  set(count: number): void {
    this._unread.set(Math.max(0, count));
  }

  decrement(): void {
    this._unread.update((n) => Math.max(0, n - 1));
  }
}
