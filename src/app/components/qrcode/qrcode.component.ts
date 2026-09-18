import { IMAGE_URL_BASE } from './../services/imageUrl';
import { FormsModule } from '@angular/forms';
import { AuthService } from './../services/auth.service';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';


@Component({
  imports: [CommonModule,FormsModule],
  selector: 'app-qrcode',
  standalone: true,
  templateUrl: './qrcode.component.html',
  styleUrl: './qrcode.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA], 
  
})

export class QrcodeComponent implements OnInit {
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
        this.qrCodeUrl = `${IMAGE_URL_BASE}${response.qr_code_url}`;
      },
      error: (error) => {
        console.error('Erreur lors de la récupération du profil:', error);
      }
    });
  }

  renewQRCode() {
    this.isLoading = true;
    Swal.fire({
      title: 'Confirmer le renouvellement',
      text: "Voulez-vous vraiment générer un nouveau QR code ? Vous aller devoir l'imprimer à nouveau et coller sur vos documents.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F6A500',
      cancelButtonColor: '#31287C',
      confirmButtonText: 'Oui, renouveller',
      cancelButtonText: 'Annuler'
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
    this.qrCodeUrl = `${IMAGE_URL_BASE}${response.new_qr_code_url}`;
    this.user.qr_code_expires_at = response.new_expiration;
    
    Swal.fire({
      icon: 'success',
      title: 'Succès !',
      text: 'QR code renouvelé avec succès',
      timer: 3000
    });
  }

  private handleRenewalError(error: any): void {
    this.isLoading = false;
    console.error('Erreur de renouvellement:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: error.error?.message || 'Échec du renouvellement du QR code'
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
