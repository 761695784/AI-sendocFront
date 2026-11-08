import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { assetUrl } from './../services/imageUrl';
import { FormsModule } from '@angular/forms';
import { AuthService } from './../services/auth.service';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';


@Component({
    imports: [TranslatePipe, CommonModule, FormsModule],
    selector: 'app-qrcode',
    templateUrl: './qrcode.component.html',
    styleUrl: './qrcode.component.css',
    changeDetection: ChangeDetectionStrategy.Eager,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class QrcodeComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  qrCodeUrl: string | null = null;
  user: any;
  isLoading: boolean = false;
  
  constructor(private authService: AuthService , private router: Router) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    this.authService.getUserProfile().subscribe({
      next: (response) => {
        this.user = response.user;
        this.qrCodeUrl = assetUrl(response.qr_code_url) || null;
      },
      error: (error) => {
        console.error('Erreur lors de la récupération du profil:', error);
      }
    });
  }

  renewQRCode() {
    this.isLoading = true;
    Swal.fire({
      title: this.i18n.t('profile.confirmer_le_renouvellement'),
      text: this.i18n.t('qrcode.voulez_vous_vraiment_generer_un_nouveau'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F6A500',
      cancelButtonColor: '#31287C',
      confirmButtonText: this.i18n.t('qrcode.oui_renouveller'),
      cancelButtonText: this.i18n.t('rf.cancel')
    }).then((result) => {
      if (result.isConfirmed) {
        this.handleRenewal();
      }
    });
  }

  private handleRenewal(): void {
    this.isLoading = true;

    this.authService.renewQrCode().subscribe({
      next: (response) => this.handleRenewalSuccess(response),
      error: (error) => this.handleRenewalError(error)
    });
  }

  private handleRenewalSuccess(response: any): void {
    this.isLoading = false;
    this.qrCodeUrl = assetUrl(response.new_qr_code_url ?? response.qr_code_url) || null;
    this.user.qr_code_expires_at = response.new_expiration;
    
    Swal.fire({
      icon: 'success',
      title: this.i18n.t('reset.succes'),
      text: this.i18n.t('qrcode.qr_code_renouvele_avec_succes'),
      timer: 3000
    });
  }

  private handleRenewalError(error: any): void {
    this.isLoading = false;
    console.error('Erreur de renouvellement:', error);
    
    Swal.fire({
      icon: 'error',
      title: this.i18n.t('detail.erreur'),
      text: error.error?.message || this.i18n.t('qrcode.echec_du_renouvellement_du_qr_code')
    });
  }


  printQrCode() {
    const printContents = document.querySelector('.qr-container')?.outerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = printContents || '';
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  }

  navigateToModify() {
    this.router.navigate(['/modify']);
  }
  }
