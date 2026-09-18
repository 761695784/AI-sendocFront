import { FormsModule } from '@angular/forms';
import { FooterComponent } from './../footer/footer.component';
import { NavbarComponent } from './../navbar/navbar.component';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeclarationService } from '../services/declaration.service';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lostdeclaration',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, FormsModule, CommonModule],
  templateUrl: './lostdeclaration.component.html',
  styleUrl: './lostdeclaration.component.css'
})
export class LostdeclarationComponent {
  declarations: any[] = [];
  trashedDeclarations: any[] = [];
  showTrashedDeclarations: boolean = false;

  constructor(private declarationService: DeclarationService, private http: HttpClient) {}

  // Charger les déclarations de l'utilisateur à l'initialisation
  ngOnInit() {
    this.loadUserDeclarations();
  }

  // Charger les déclarations de l'utilisateur connecté
  loadUserDeclarations() {
    this.declarationService.getUserDeclarations().subscribe(
      (response: any) => {
        this.declarations = response.data;
      },
      (error) => {
        // console.error('Erreur lors du chargement des déclarations', error);
      }
    );
  }

  // Nouvelle méthode de suppression avec confirmation
  deleteDeclaration(uuid: string) {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: "Cette action est irréversible !",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        // Si l'utilisateur confirme, effectuer la suppression
        this.declarationService.deleteDeclaration(uuid).subscribe(
          () => {
            this.declarations = this.declarations.filter(d => d.uuid !== uuid);
            Swal.fire('Supprimé!', 'La déclaration a été supprimée avec succès.', 'success');
          },
          (error) => {
            // console.error('Erreur lors de la suppression de la déclaration', error);
            Swal.fire('Erreur!', 'Une erreur est survenue lors de la suppression.', 'error');
          }
        );
      }
    });
  }

  // Charger les déclarations supprimées
  loadTrashedDeclarations() {
    this.declarationService.getTrashedDeclarations().subscribe(
      (response) => {
        // console.log('Déclarations supprimées:', response); // Vérifie les données reçues
        this.trashedDeclarations = response.data;  // Utilise le tableau "data" retourné par l'API
      },
      (error) => {
        // console.error('Erreur lors du chargement des déclarations supprimées', error);
      }
    );
  }

  // Restaurer une déclaration supprimée
  restoreDeclaration(id: number) {
    this.declarationService.restoreDeclaration(id).subscribe(
      () => {
        this.loadTrashedDeclarations(); // Recharger après restauration
        Swal.fire('Restauré!', 'La déclaration a été restaurée avec succès.', 'success');
      },
      (error) => {
        // console.error('Erreur lors de la restauration de la déclaration', error);
        Swal.fire('Erreur!', 'Une erreur est survenue lors de la restauration.', 'error');
      }
    );
  }

  // Basculer entre les déclarations normales et supprimées
  toggleTrashedView() {
    this.showTrashedDeclarations = !this.showTrashedDeclarations;
    // console.log('Afficher les déclarations supprimées:', this.showTrashedDeclarations); // Vérifie l'état

    if (this.showTrashedDeclarations) {
      this.loadTrashedDeclarations(); // Charger les déclarations supprimées si on bascule sur la vue corbeille
    } else {
      this.loadUserDeclarations(); // Recharger les déclarations normales si on revient à la vue normale
    }
  }

    // Afficher le certificat de perte
  viewCertificate(uuid: string): void {
    this.declarationService.viewCertificate(uuid); // gère tout en interne
  }
  // Telecharger le certificat
  downloadCertificate(uuid: string): void {
    this.declarationService.triggerDownload(uuid); // gère tout en interne
  }

}
