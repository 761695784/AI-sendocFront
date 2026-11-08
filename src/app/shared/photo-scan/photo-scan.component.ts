import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe, TranslateFrPipe } from '../../core/i18n/translate.pipe';
import { ChangeDetectionStrategy, Component, OnDestroy, input, output, signal, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OcrScan } from '../../core/api/api.types';
import { apiErrorMessage } from '../../core/api/api-v2.client';
import { checkImage, shrinkImage } from '../media/image-tools';

export interface PhotoScanResult {
  /** Photo réduite (à envoyer si la lecture n'a pas abouti). */
  photo: Blob;
  /** Lecture OCR réussie (null si indisponible ou illisible). */
  scan: OcrScan | null;
}

/**
 * Prise de photo d'une pièce + lecture automatique (OCR).
 * Réutilisé pour le dépôt d'un document trouvé et le contrôle d'identité à la restitution.
 *
 *   <app-photo-scan [scanner]="scanFn" (result)="onScan($event)" (cleared)="onClear()" />
 */
@Component({
  selector: 'app-photo-scan',
  imports: [TranslatePipe, TranslateFrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!photoUrl()) {
      <div class="row g-2">
        <div class="col-sm-6">
          <label class="dt-drop w-100 h-100 m-0">
            <i class="fas fa-camera" aria-hidden="true"></i>
            <strong>{{ takeLabel() | tfr }}</strong>
            <small>{{ 'scan.piece_a_plat_bien_eclairee' | t }}</small>
            <input type="file" accept="image/*" capture="environment" hidden (change)="onFile($event)" />
          </label>
        </div>
        <div class="col-sm-6">
          <label class="dt-drop w-100 h-100 m-0">
            <i class="fas fa-image" aria-hidden="true"></i>
            <strong>{{ 'publish.choisir_une_image' | t }}</strong>
            <small>{{ 'publish.jpg_png_ou_webp' | t }}</small>
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="onFile($event)" />
          </label>
        </div>
      </div>
    } @else {
      <div class="row g-3 align-items-start">
        <div class="col-md-5">
          <img class="dt-photo" [src]="photoUrl()" [alt]="'scan.photo_de_la_piece' | t" />
          <button type="button" class="btn btn-link btn-sm px-0" (click)="clear()"><i class="fas fa-redo me-1" aria-hidden="true"></i> {{ 'scan.reprendre' | t }}</button>
        </div>
        <div class="col-md-7">
          @switch (state()) {
            @case ('reading') {
              <div class="d-flex align-items-center gap-2 py-3"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> {{ 'scan.lecture_de_la_piece' | t }}</div>
            }
            @case ('read') {
              <div class="dt-callout dt-callout--success mt-0">
                <i class="fas fa-magic" aria-hidden="true"></i>
                <div><strong>{{ 'scan.piece_lue' | t }}@if (score()) { {{ 'scan.quality' | t: { n: score() } }} }</strong> {{ 'scan.les_champs_ont_ete_remplis_verifiez' | t }}</div>
              </div>
              @for (c of checks(); track c.code) {
                <div class="small mt-1" [class.text-success]="c.level === 'ok'" [class.text-warning-emphasis]="c.level === 'warning'">
                  <i class="fas me-1" [class.fa-check]="c.level === 'ok'" [class.fa-exclamation-triangle]="c.level !== 'ok'" aria-hidden="true"></i>{{ c.message }}
                </div>
              }
            }
            @default {
              <div class="dt-callout mt-0" [class.dt-callout--warning]="state() === 'manual'" [class.dt-callout--danger]="state() === 'failed'">
                <i class="fas fa-info-circle" aria-hidden="true"></i><div>{{ message() }}</div>
              </div>
            }
          }
        </div>
      </div>
    }
    @if (error()) { <small class="dt-error">{{ error() }}</small> }
  `,
})
export class PhotoScanComponent implements OnDestroy {
  private readonly i18n = inject(I18nService);
  /** Appel de lecture (CounterApi.scan ou CitizenApi.scan). */
  readonly scanner = input.required<(photo: Blob) => Observable<OcrScan>>();
  readonly takeLabel = input('Prendre une photo');

  readonly result = output<PhotoScanResult>();
  readonly cleared = output<void>();

  readonly photoUrl = signal<string | null>(null);
  readonly state = signal<'idle' | 'reading' | 'read' | 'manual' | 'failed'>('idle');
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly checks = signal<{ code?: string; level?: string; message?: string }[]>([]);
  readonly score = signal<number | null>(null);

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    const problem = checkImage(file, 5);
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.error.set(null);
    const photo = await shrinkImage(file);
    this.revoke();
    this.photoUrl.set(URL.createObjectURL(photo));
    this.state.set('reading');
    this.scanner()(photo).subscribe({
      next: (scan) => {
        this.state.set('read');
        this.checks.set((scan.checks ?? []).filter((c) => c.message));
        this.score.set(scan.quality?.score ?? null);
        this.result.emit({ photo, scan });
      },
      error: (e: HttpErrorResponse) => {
        this.state.set(e.status === 422 ? 'failed' : 'manual');
        this.message.set(apiErrorMessage(e, this.i18n.t('scan.lecture_automatique_indisponible_remplis')));
        this.result.emit({ photo, scan: null });
      },
    });
  }

  clear(): void {
    this.revoke();
    this.state.set('idle');
    this.checks.set([]);
    this.cleared.emit();
  }

  ngOnDestroy(): void {
    this.revoke();
  }

  private revoke(): void {
    const url = this.photoUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.photoUrl.set(null);
  }
}
