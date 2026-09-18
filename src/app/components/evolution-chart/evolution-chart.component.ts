import { Component, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { PublicationsService } from '../services/publications.service';

@Component({
  selector: 'app-evolution-chart',
  standalone: true,
  imports: [],
  templateUrl: './evolution-chart.component.html',
  styleUrl: './evolution-chart.component.css'
})
export class EvolutionChartComponent implements OnInit {

  public chart: any;

  constructor(private publicationService: PublicationsService) {}

  ngOnInit(): void {
    this.loadChartData();
  }

  // 
  loadChartData() {
    this.publicationService.getEvolutionData().subscribe((data: any) => {
      const dates = data.map((item: any) => item.date);
      const declarations = data.map((item: any) => item.declarations);
      const publications = data.map((item: any) => item.publications);

      this.chart = new Chart('evolutionChart', {
        type: 'line', // Utiliser 'line' pour un graphique en courbes
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Déclarations de perte',
              data: declarations,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              fill: true,
            },
            {
              label: 'Publications',
              data: publications,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              fill: true,
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    });
  }
}
