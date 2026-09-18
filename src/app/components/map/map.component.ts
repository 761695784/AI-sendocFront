import { AfterViewInit, Component } from '@angular/core';
import * as maplibregl from 'maplibre-gl';
import { CommonModule } from '@angular/common';
import { PublicationsService } from '../services/publications.service';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule], // Ajout du module requis pour les fonctionnalités Angular
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'] // Correction: styleUrls au lieu de styleUrl
})
export class MapComponent implements AfterViewInit {

  private map!: maplibregl.Map;

  constructor(@Inject(PLATFORM_ID) private platformId: object, private publicationsService: PublicationsService) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadMap();
    }
  }



  loadMap(): void {
    this.map = new maplibregl.Map({
      container: 'map', // ID de l'élément HTML où la carte sera rendue
      style: 'https://demotiles.maplibre.org/style.json', // URL du style de carte MapLibre
      center: [-17.4467, 14.6928], // Longitude et latitude pour centrer la carte sur le Sénégal
      zoom: 6 // Niveau de zoom initial
    });

    // Récupérer et afficher les publications par région ou localité
    this.publicationsService.getPublicationsByLocation().subscribe(data => {
      // console.log("Données récupérées :", data); // Vérifier le format des données
      data.forEach(location => {
        new maplibregl.Marker()
          .setLngLat([+location.longitude, +location.latitude])
          .setPopup(new maplibregl.Popup().setHTML(`<h5>${location.name}</h5><p>Publications: ${location.publications}</p>`))
          .addTo(this.map);
      });
    }, error => console.error("Erreur lors de la récupération des données :", error));

  }

}
