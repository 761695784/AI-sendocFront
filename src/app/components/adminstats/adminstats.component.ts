import { EmailActivityChartComponent } from '../email-activity-chart/email-activity-chart.component';
import { EvolutionChartComponent } from '../evolution-chart/evolution-chart.component';
import { MapComponent } from '../map/map.component';
import { PublicationTypeChartComponent } from '../publication-type-chart/publication-type-chart.component';
import { RestitutionChartComponent } from '../restitution-chart/restitution-chart.component';
import { SideheadersComponent } from '../sideheaders/sideheaders.component';
import { StatusBarChartComponent } from './../status-bar-chart/status-bar-chart.component';
import { Component } from '@angular/core';

@Component({
  selector: 'app-adminstats',
  standalone: true,
  imports: [StatusBarChartComponent, SideheadersComponent,EvolutionChartComponent, EmailActivityChartComponent,PublicationTypeChartComponent, RestitutionChartComponent,MapComponent],
  templateUrl: './adminstats.component.html',
  styleUrl: './adminstats.component.css'
})
export class AdminstatsComponent {

}
