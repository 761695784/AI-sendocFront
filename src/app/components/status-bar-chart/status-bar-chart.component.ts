import { Component } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { PublicationsService } from '../services/publications.service';

@Component({
  selector: 'app-status-bar-chart',
  standalone: true,
  imports: [],
  templateUrl: './status-bar-chart.component.html',
  styleUrl: './status-bar-chart.component.css'
})
export class StatusBarChartComponent {
  chart: any;

  constructor(private publicationService: PublicationsService) {}

  ngOnInit(): void {
    this.loadChartData();
  }

  loadChartData() {
    this.publicationService.getDocumentStatusCount().subscribe((data: any) => {
      // console.log(data); // Ajoutez cette ligne pour voir les données dans la console
      const recovered = data['récupéré'];
      const notRecovered = data['non_récupéré'];


      // Générer le graphique uniquement si les données sont valides
      if (recovered !== undefined && notRecovered !== undefined) {
        this.chart = new Chart('documentStatusChart', {
          type: 'bar',
          data: {
            labels: ['Récupéré', 'Non récupéré'],
            datasets: [{
              label: 'Nombre de documents',
              data: [recovered, notRecovered],
              backgroundColor: ['#36a2eb', '#ff6384'], // Couleurs pour les barres

            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero:false
              }
            }
          }
        });
      } else {
        // console.error('Les données ne sont pas disponibles ou sont incorrectes');
      }
    });

  }

}
