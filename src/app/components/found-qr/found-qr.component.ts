import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FoundQrService } from '../services/found-qr.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
    selector: 'app-found-qr',
    imports: [TranslatePipe, FormsModule, RouterModule],
    templateUrl: './found-qr.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./found-qr.component.css']
})
export class FoundQrComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  token: string = '';
  finderPhone: string = '';
  isLoading: boolean = false;
  message: string = '';

  constructor(
    private route: ActivatedRoute,
    private foundQrService: FoundQrService,
    private router: Router
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    // console.log('Token récupéré :', this.token); // Pour débogage
  }

  submitPhone() {
    if (!this.finderPhone) {
      this.message = this.i18n.t('foundqr.veuillez_entrer_un_numero_de_telephone');
      return;
    }

    this.isLoading = true;
    this.foundQrService.submitFinderPhone(this.token, this.finderPhone).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showSuccessAlert();
        this.finderPhone = ''; // Réinitialiser le champ
        this.message = '';
      },
      error: (error) => {
        this.isLoading = false;
        this.showErrorAlert(error);
      }
    });
  }

  private showSuccessAlert() {
    Swal.fire({
      title: this.i18n.t('foundqr.succes'),
      text: this.i18n.t('foundqr.le_proprietaire_est_notifie'),
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }

  private showErrorAlert(error: any) {
    Swal.fire({
      title: this.i18n.t('register.erreur'),
      text: error.message || this.i18n.t('foundqr.une_erreur_est_survenue'),
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }

  navigateToHome() {
    this.router.navigate(['/accueil']);
  }
}
