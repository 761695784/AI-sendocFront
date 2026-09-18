import { Component, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { PublicationsService } from '../services/publications.service';

@Component({
  selector: 'app-email-activity-chart',
  standalone: true,
  imports: [],
  templateUrl: './email-activity-chart.component.html',
  styleUrls: ['./email-activity-chart.component.css'] // Correction ici, c'est 'styleUrls'
})
export class EmailActivityChartComponent implements OnInit {

  public chart: any;

  constructor(private publicationService: PublicationsService) {}

  ngOnInit(): void {
    this.loadChartData();
  }

  loadChartData() {
    this.publicationService.getEmailActivity().subscribe((data: any) => {
      const subjects = data.map((item: any) => item.subject);
      const counts = data.map((item: any) => item.count);

      this.chart = new Chart('emailActivityChart', {
        type: 'bar',
        data: {
          labels: subjects, // Sujets des emails
          datasets: [{
            label: 'Nombre d\'emails envoyés',
            data: counts, // Fréquence de chaque sujet
            backgroundColor: [
              'rgba(122, 146, 0, 1)', // Rouge
              'rgba(252, 78, 0, 1)', // Bleu
              'rgba(255, 206, 86, 0.7)', // Jaune
              'rgba(75, 192, 192, 0.7)', // Turquoise
              'rgba(153, 102, 255, 0.7)', // Violet
              'rgba(255, 159, 64, 0.7)'  // Orange
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // Pour permettre de contrôler la taille via CSS
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
