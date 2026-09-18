import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RapportService, Rapport } from '../services/rapport.service';
import { SideheadersComponent } from '../sideheaders/sideheaders.component';

@Component({
  selector: 'app-adminrapport',
  standalone: true,
  imports: [CommonModule, FormsModule,SideheadersComponent],
  templateUrl: './adminrapport.component.html',
  styleUrl: './adminrapport.component.css'
})
export class AdminrapportComponent implements OnInit {

  // ── État UI ────────────────────────────────────────────────
  chargement        = false;
  generationEnCours = false;
  messageSucces     = '';
  messageErreur     = '';
  rapportActif:     string | null = null;
  rapportASupprimer: Rapport | null = null;

  // ── Formulaire de génération ──────────────────────────────
  typeRapport:       'mensuel' | 'annuel' = 'mensuel';
  anneeSelectionnee: number = new Date().getFullYear();
  moisSelectionne:   number | null = new Date().getMonth() + 1;

  // ── Données ────────────────────────────────────────────────
  rapports: Rapport[] = [];

  // ── Listes de sélection ───────────────────────────────────
  anneesDisponibles: number[] = [];

  moisDisponibles = [
    { valeur: 1,  label: 'Janvier'   },
    { valeur: 2,  label: 'Février'   },
    { valeur: 3,  label: 'Mars'      },
    { valeur: 4,  label: 'Avril'     },
    { valeur: 5,  label: 'Mai'       },
    { valeur: 6,  label: 'Juin'      },
    { valeur: 7,  label: 'Juillet'   },
    { valeur: 8,  label: 'Août'      },
    { valeur: 9,  label: 'Septembre' },
    { valeur: 10, label: 'Octobre'   },
    { valeur: 11, label: 'Novembre'  },
    { valeur: 12, label: 'Décembre'  },
  ];

  constructor(private rapportService: RapportService) {}

  ngOnInit(): void {
    this.buildAnneesDisponibles();
    this.chargerRapports();
  }

  // =========================================================
  // CHARGER LA LISTE DES RAPPORTS
  // =========================================================
  chargerRapports(): void {
    this.chargement = true;

    this.rapportService.getAllRapports().subscribe({
      next: (rapports) => {
        this.rapports   = rapports;
        this.chargement = false;
      },
      error: (err) => {
        this.afficherErreur('Impossible de charger la liste des rapports.');
        console.error('Erreur lors de la récupération des rapports:', err);
        this.chargement = false;
      }
    });
  }

  // =========================================================
  // GÉNÉRER ET SAUVEGARDER UN RAPPORT
  // =========================================================
  genererRapport(): void {
    if (!this.validerFormulaire()) return;

    this.generationEnCours = true;
    this.effacerMessages();

    const mois = this.typeRapport === 'mensuel' && this.moisSelectionne
      ? this.moisSelectionne
      : undefined;

    this.rapportService.genererRapport(this.anneeSelectionnee, mois).subscribe({
      next: (res) => {
        this.generationEnCours = false;
        if (res.success) {
          this.afficherSucces(res.message);
          this.chargerRapports(); // Recharger la liste comme loadAllPublications()
        } else {
          this.afficherErreur('Erreur lors de la génération du rapport.');
        }
      },
      error: (err) => {
        this.generationEnCours = false;
        this.afficherErreur(err?.message ?? 'Une erreur inattendue est survenue.');
        console.error('Erreur génération rapport:', err);
      }
    });
  }

  // =========================================================
  // APERÇU PDF LIVE (sans sauvegarder)
  // =========================================================
  ouvrirApercu(): void {
    if (!this.validerFormulaire()) return;

    const mois = this.typeRapport === 'mensuel' && this.moisSelectionne
      ? this.moisSelectionne
      : undefined;

    const url = this.rapportService.buildApercuUrl(this.anneeSelectionnee, mois);
    window.open(url, '_blank');
  }

  // =========================================================
  // VOIR UN RAPPORT EXISTANT (PDF dans nouvel onglet)
  // =========================================================
  voirRapport(rapport: Rapport): void {
    if (!rapport.pdf_existe) return;
    this.rapportActif = rapport.uuid;

    this.rapportService.voirRapport(rapport.uuid).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        this.rapportActif = null;
      },
      error: (err) => {
        this.afficherErreur("Impossible d'ouvrir le rapport PDF.");
        console.error('Erreur voirRapport:', err);
        this.rapportActif = null;
      }
    });
  }

  // =========================================================
  // TÉLÉCHARGER UN RAPPORT
  // =========================================================
  telechargerRapport(rapport: Rapport): void {
    if (!rapport.pdf_existe) return;

    this.rapportService.telechargerRapport(rapport.uuid).subscribe({
      next: (blob) => {
        const url    = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href     = url;
        anchor.download = `DocTrack-Rapport-${rapport.periode_label}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.afficherErreur('Impossible de télécharger le rapport.');
        console.error('Erreur téléchargement rapport:', err);
      }
    });
  }

  // =========================================================
  // RÉGÉNÉRER UN RAPPORT EXISTANT
  // Pré-remplit le formulaire + relance la génération
  // =========================================================
  regenRapport(rapport: Rapport): void {
    this.anneeSelectionnee = rapport.annee;
    this.moisSelectionne   = rapport.mois;
    this.typeRapport       = rapport.mois ? 'mensuel' : 'annuel';
    this.genererRapport();
  }

  // =========================================================
  // CONFIRMER LA SUPPRESSION (affiche la modale)
  // =========================================================
  confirmerSuppression(rapport: Rapport): void {
    this.rapportASupprimer = rapport;
  }

  // =========================================================
  // SUPPRIMER UN RAPPORT
  // =========================================================
  supprimerRapport(): void {
    if (!this.rapportASupprimer) return;

    const uuid  = this.rapportASupprimer.uuid;
    const label = this.rapportASupprimer.periode_label;
    this.rapportASupprimer = null;

    this.rapportService.supprimerRapport(uuid).subscribe({
      next: (res) => {
        if (res.success) {
          // Retirer localement sans recharger — même pattern que updatePublicationStatus
          this.rapports = this.rapports.filter(r => r.uuid !== uuid);
          this.afficherSucces(`Rapport "${label}" supprimé avec succès.`);
        }
      },
      error: (err) => {
        this.afficherErreur('Impossible de supprimer le rapport.');
        console.error('Erreur suppression rapport:', err);
      }
    });
  }

  // =========================================================
  // UTILITAIRES
  // =========================================================
  trackByUuid(_: number, rapport: Rapport): string {
    return rapport.uuid;
  }

  private buildAnneesDisponibles(): void {
    const anneeActuelle = new Date().getFullYear();
    for (let a = anneeActuelle; a >= 2020; a--) {
      this.anneesDisponibles.push(a);
    }
  }

  private validerFormulaire(): boolean {
    if (!this.anneeSelectionnee) {
      this.afficherErreur('Veuillez sélectionner une année.');
      return false;
    }
    if (this.typeRapport === 'mensuel' && !this.moisSelectionne) {
      this.afficherErreur('Veuillez sélectionner un mois.');
      return false;
    }
    return true;
  }

  private afficherSucces(message: string): void {
    this.messageSucces = message;
    this.messageErreur = '';
    setTimeout(() => (this.messageSucces = ''), 5000);
  }

  private afficherErreur(message: string): void {
    this.messageErreur = message;
    this.messageSucces = '';
    setTimeout(() => (this.messageErreur = ''), 6000);
  }

  private effacerMessages(): void {
    this.messageSucces = '';
    this.messageErreur = '';
  }
}
