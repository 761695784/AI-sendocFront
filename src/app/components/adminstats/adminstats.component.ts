import { EmailActivityChartComponent } from '../email-activity-chart/email-activity-chart.component';
import { EvolutionChartComponent } from '../evolution-chart/evolution-chart.component';
import { MapComponent } from '../map/map.component';
import { PublicationTypeChartComponent } from '../publication-type-chart/publication-type-chart.component';
import { RestitutionChartComponent } from '../restitution-chart/restitution-chart.component';
import { StatusBarChartComponent } from './../status-bar-chart/status-bar-chart.component';
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-adminstats',
    imports: [StatusBarChartComponent, EvolutionChartComponent, EmailActivityChartComponent, PublicationTypeChartComponent, RestitutionChartComponent, MapComponent],
    templateUrl: './adminstats.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './adminstats.component.css'
})
export class AdminstatsComponent {

}
