import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, PLATFORM_ID, ViewEncapsulation,
  inject, signal, viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../services/apiUrl';

/** Une bulle : nombre de publications dans un département. */
export interface MapLocation {
  name: string;
  region?: string;
  latitude: number;
  longitude: number;
  publications: number;
}

/** Sénégal entier (ouest, sud, est, nord). */
const SENEGAL: [[number, number], [number, number]] = [[-17.6, 12.25], [-11.3, 16.75]];

/**
 * Carte des publications par département (MapLibre + fond OpenStreetMap).
 * Chaque bulle affiche le nombre de documents publiés ; sa taille suit ce nombre.
 * La bibliothèque n'est chargée que dans le navigateur, au moment où la carte s'affiche.
 */
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Les bulles sont créées par MapLibre hors de la vue Angular : leurs styles doivent être globaux.
  encapsulation: ViewEncapsulation.None,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private map: { remove(): void } | null = null;

  readonly locations = signal<MapLocation[]>([]);
  readonly unlocated = signal(0);
  readonly status = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');

  ngAfterViewInit(): void {
    if (!this.browser) {
      return;
    }
    this.http.get<MapLocation[]>(`${apiUrl}/lieu`, { observe: 'response' }).subscribe({
      next: (res) => {
        const data = (res.body ?? [])
          .map((l) => ({ ...l, latitude: +l.latitude, longitude: +l.longitude, publications: +l.publications }))
          .filter((l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude) && l.publications > 0);
        this.locations.set(data);
        this.unlocated.set(Number(res.headers.get('X-Unlocated') ?? 0) || 0);
        this.status.set(data.length ? 'ready' : 'empty');
        void this.draw(data);
      },
      error: () => {
        this.status.set('error');
        void this.draw([]);
      },
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private async draw(locations: MapLocation[]): Promise<void> {
    let maplibregl: typeof import('maplibre-gl');
    try {
      const mod = await import('maplibre-gl');
      // Paquet CommonJS : selon le bundler, l'API est sur l'export par défaut.
      maplibregl = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod;
    } catch (e) {
      console.warn('Carte : bibliothèque indisponible', e);
      return;
    }

    let map: import('maplibre-gl').Map;
    try {
      map = new maplibregl.Map({
        container: this.container().nativeElement,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              maxzoom: 19,
              attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        bounds: SENEGAL,
        fitBoundsOptions: { padding: 20 },
        maxBounds: [[-21, 10], [-8, 19]],
        cooperativeGestures: true, // la page défile normalement ; Ctrl + molette pour zoomer
        attributionControl: { compact: true },
      });
    } catch (e) {
      console.warn('Carte : affichage impossible', e);
      return; // navigateur sans WebGL : la liste sous la carte reste disponible
    }
    this.map = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // Vue d'ensemble : une bulle par région (les départements de Dakar se chevauchent) ;
    // en zoomant (niveau 8 et plus), une bulle par département.
    const regions = byRegion(locations);
    let markers: import('maplibre-gl').Marker[] = [];
    let shown: 'region' | 'department' | null = null;
    const render = () => {
      const level = map.getZoom() >= 8 ? 'department' : 'region';
      if (level === shown) {
        return;
      }
      shown = level;
      markers.forEach((m) => m.remove());
      const items = level === 'region' ? regions : locations;
      const max = Math.max(1, ...items.map((l) => l.publications));
      // Les plus petites bulles en dernier : elles restent cliquables au-dessus des grandes.
      markers = [...items].sort((a, b) => b.publications - a.publications).map((l) => {
        const size = Math.round(30 + 34 * Math.sqrt(l.publications / max));
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'dt-map-bubble';
        el.style.width = el.style.height = `${size}px`;
        el.style.fontSize = `${Math.max(12, Math.round(size / 3))}px`;
        el.textContent = String(l.publications);
        el.setAttribute('aria-label', `${l.name} : ${l.publications} publication${l.publications > 1 ? 's' : ''}`);
        const popup = new maplibregl.Popup({ offset: size / 2 + 4, closeButton: false })
          .setDOMContent(this.popupContent(l, level === 'region' ? locations.filter((d) => (d.region ?? d.name) === l.name) : []));
        return new maplibregl.Marker({ element: el }).setLngLat([l.longitude, l.latitude]).setPopup(popup).addTo(map);
      });
    };
    render();
    map.on('zoomend', render);
  }

  private popupContent(l: MapLocation, departments: MapLocation[]): HTMLElement {
    const box = document.createElement('div');
    box.className = 'dt-map-popup';
    const line = (tag: 'strong' | 'span', text: string) => {
      const el = document.createElement(tag);
      el.textContent = text;
      box.appendChild(el);
    };
    line('strong', departments.length ? `Région de ${l.name}` : l.name);
    if (!departments.length && l.region && l.region !== l.name) {
      line('span', `Région de ${l.region}`);
    }
    line('span', plural(l.publications));
    if (departments.length > 1) {
      for (const d of departments) {
        line('span', `· ${d.name} : ${d.publications}`);
      }
    }
    return box;
  }
}

function plural(n: number): string {
  return `${n} publication${n > 1 ? 's' : ''}`;
}

/** Regroupe les départements par région ; la bulle se place au centre (pondéré) de ses départements. */
function byRegion(locations: MapLocation[]): MapLocation[] {
  const groups = new Map<string, MapLocation[]>();
  for (const l of locations) {
    const key = l.region ?? l.name;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  return [...groups.entries()].map(([name, items]) => {
    const total = items.reduce((sum, l) => sum + l.publications, 0);
    return {
      name,
      latitude: items.reduce((sum, l) => sum + l.latitude * l.publications, 0) / total,
      longitude: items.reduce((sum, l) => sum + l.longitude * l.publications, 0) / total,
      publications: total,
    };
  });
}
