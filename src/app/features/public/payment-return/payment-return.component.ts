import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';

/**
 * Retour de Wave après un paiement (/paiement/succes?ref=… ou /paiement/echec?ref=…).
 * La confirmation officielle arrive par la notification signée de Wave à l'API :
 * cette page informe seulement la personne.
 */
@Component({
  selector: 'app-payment-return',
  imports: [RouterLink, NavbarComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />
    <div class="dt-page">
      <div class="dt-container" style="max-width: 560px; padding-top: 3rem">
        <div class="dt-card text-center py-4">
          @if (success()) {
            <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--dt-success)" aria-hidden="true"></i>
            <h1 class="h4 mt-2">Paiement effectué</h1>
            <p>Merci ! Dès que Wave confirme le paiement à DocTrack (quelques secondes), votre démarche est débloquée et vous recevez un reçu par SMS.</p>
          } @else {
            <i class="fas fa-times-circle" style="font-size: 3rem; color: var(--dt-danger)" aria-hidden="true"></i>
            <h1 class="h4 mt-2">Paiement non abouti</h1>
            <p>Le paiement a été annulé ou refusé. Aucun montant n'a été prélevé. Vous pouvez réessayer depuis « Mes paiements ».</p>
          }
          @if (ref()) { <p class="dt-muted small">Référence : <span class="dt-mono">{{ ref() }}</span></p> }
          <a routerLink="/mon-espace/paiements" class="btn btn-dt mt-2">Mes paiements</a>
        </div>
      </div>
    </div>
    <app-footer />
  `,
})
export class PaymentReturnComponent {
  private readonly route = inject(ActivatedRoute);
  /** Référence du frais (paramètre ?ref=). */
  readonly ref = input<string | undefined>();
  readonly success = computed(() => this.route.snapshot.data['outcome'] === 'success');
}
