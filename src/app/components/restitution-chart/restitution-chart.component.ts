import { Component, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { PublicationsService } from '../services/publications.service';

@Component({
  selector: 'app-restitution-chart',
  standalone: true,
  imports: [],
  templateUrl: './restitution-chart.component.html',
  styleUrls: ['./restitution-chart.component.css']
})
export class RestitutionChartComponent implements OnInit {

  public chart: any;

  constructor(private publicationService: PublicationsService) {}

  ngOnInit(): void {
    this.loadChartData();
  }

  // Chargement des données pour affiicher le graphe
  loadChartData() {
    this.publicationService.getRestitutionData().subscribe((data: any) => {
      const restitutionCount = data.restitutionCount;
      const publicationCount = data.publicationCount;

      this.chart = new Chart('restitutionChart', {
        type: 'pie', // Utiliser 'pie' pour un graphique circulaire
        data: {
          labels: ['Demandes de restitution', 'Publications restantes'],
          datasets: [{
            label: 'Ratio demandes de restitution',
            data: [restitutionCount, publicationCount - restitutionCount], // Évaluer le pourcentage de demandes
            backgroundColor: [
              'rgba(75, 192, 192, 0.7)', // Couleur pour demandes de restitution
              'rgba(255, 206, 86, 0.7)'  // Couleur pour publications restantes
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)', // Bordure pour demandes de restitution
              'rgba(255, 99, 132, 1)'  // Bordure pour publications restantes
            ],
            borderWidth: 2 // Une bordure légèrement plus large
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => {
                  return `${tooltipItem.label}: ${tooltipItem.raw}`;
                }
              }
            }
          }
        }
      });
    });
  }
}
