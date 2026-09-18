import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BackupService } from '../services/backup.service';
import { SideheadersComponent } from "../sideheaders/sideheaders.component";

@Component({
  selector: 'app-adminbackup',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, SidebarComponent, SideheadersComponent],
  templateUrl: './adminbackup.component.html',
  styleUrls: ['./adminbackup.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AdminbackupComponent implements OnInit {

  backups: any[]   = [];
  isLoading        = false;
  isRunning        = false;
  isCleaning       = false;
  isCheckingStatus = false;
  isDownloading    = '';

  // Stats
  totalBackups   = 0;
  totalSizeMb    = 0;
  isHealthy      = true;
  lastBackupDate = '';

  // Feedback
  successMsg   = '';
  errorMsg     = '';
  statusOutput = '';

  constructor(private backupService: BackupService) {}

  ngOnInit(): void {
    this.loadBackups();
  }

  // ── Chargement liste ──────────────────────────

  loadBackups(): void {
    this.isLoading = true;
    this.clearMessages();

    this.backupService.listBackups().subscribe({
      next: (res) => {
        this.backups      = res.backups      ?? [];
        this.totalBackups = res.total        ?? 0;
        this.totalSizeMb  = res.total_size_mb ?? 0;

        if (this.backups.length > 0) {
          this.lastBackupDate = this.backups[0].created_at
            ? new Date(this.backups[0].created_at).toLocaleDateString('fr-FR')
            : '—';
        }

        this.isLoading = false;
      },
      error: () => {
        this.errorMsg  = 'Impossible de charger la liste des sauvegardes.';
        this.isLoading = false;
      }
    });
  }

  // ── Lancer un backup ──────────────────────────

  runBackup(): void {
    this.isRunning = true;
    this.clearMessages();

    this.backupService.runBackup().subscribe({
      next: () => {
        this.isRunning  = false;
        this.successMsg = 'Sauvegarde effectuée avec succès !';
        this.loadBackups();
      },
      error: (err) => {
        this.isRunning = false;
        this.errorMsg  = err.error?.message ?? 'Erreur lors de la sauvegarde.';
      }
    });
  }

  // ── Vérifier la santé ─────────────────────────

  checkStatus(): void {
    this.isCheckingStatus = true;
    this.clearMessages();
    this.statusOutput = '';

    this.backupService.checkStatus().subscribe({
      next: (res) => {
        this.isCheckingStatus = false;
        this.statusOutput     = res.status ?? 'Vérification terminée.';
        this.isHealthy        = !this.statusOutput.toLowerCase().includes('unhealthy');
        this.successMsg       = 'Vérification de santé effectuée.';
      },
      error: (err) => {
        this.isCheckingStatus = false;
        this.errorMsg         = err.error?.message ?? 'Erreur lors du monitoring.';
        this.isHealthy        = false;
      }
    });
  }

  // ── Nettoyer les backups ───────────────────────

  cleanBackups(): void {
    if (!confirm('Voulez-vous supprimer les anciennes sauvegardes ?')) return;

    this.isCleaning = true;
    this.clearMessages();

    this.backupService.cleanBackups().subscribe({
      next: () => {
        this.isCleaning = false;
        this.successMsg = 'Nettoyage effectué avec succès.';
        this.loadBackups();
      },
      error: (err) => {
        this.isCleaning = false;
        this.errorMsg   = err.error?.message ?? 'Erreur lors du nettoyage.';
      }
    });
  }

  // ── Télécharger un backup ─────────────────────

  downloadBackup(filename: string): void {
    this.isDownloading = filename;
    this.clearMessages();

    this.backupService.downloadBackup(filename).subscribe({
      next: (blob) => {
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.isDownloading = '';
        this.successMsg    = `Téléchargement de "${filename}" lancé.`;
      },
      error: () => {
        this.isDownloading = '';
        this.errorMsg      = 'Erreur lors du téléchargement.';
      }
    });
  }

  // ── Helpers ───────────────────────────────────

  formatBytes(bytes: number): string {
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  clearMessages(): void {
    this.successMsg = '';
    this.errorMsg   = '';
  }
}
