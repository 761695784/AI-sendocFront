
import { Component, NgModule, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';


@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterModule],
    templateUrl: './sidebar.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

  sidebarOpen = false;

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
