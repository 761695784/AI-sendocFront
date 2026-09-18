import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FoundQrService } from '../services/found-qr.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-found-qr',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ],
  templateUrl: './found-qr.component.html',
  styleUrls: ['./found-qr.component.css']
})
export class FoundQrComponent implements OnInit {
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
      this.message = 'Veuillez entrer un numéro de téléphone valide.';
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
      title: 'Succès!',
      text: 'Le Propriétaire est Notifié !',
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }

  private showErrorAlert(error: any) {
    Swal.fire({
      title: 'Erreur!',
      text: error.message || 'Une erreur est survenue',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }

  navigateToHome() {
    this.router.navigate(['/accueil']);
  }
}
