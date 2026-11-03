import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { CitizenApi } from '../../../core/api/citizen.api';
import { DeclareLossResponse, DocTypeRef } from '../../../core/api/citizen.types';
import { NotifyService } from '../../../shared/feedback/notify.service';
import { fieldError } from '../../../shared/forms/validators';
import { openBlob } from '../../../shared/media/open-blob';

/** Noms comme sur les pièces sénégalaises : lettres sans accents et espaces (règle conservée de la V1). */
const NAME_PATTERN = '[a-zA-Z ]*';

/**
 * Déclarer une perte en ligne.
 *
 * Le citoyen reçoit un RÉCÉPISSÉ DocTrack, pas un certificat de perte : la déclaration n'est
 * rattachée à aucune structure. Pour obtenir le certificat de perte, il se présente avec la
 * référence (ou le QR code du récépissé) dans un commissariat ou une brigade partenaire :
 * l'agent retrouve la déclaration, vérifie son identité et délivre le certificat.
 */
@Component({
  selector: 'app-declare-loss',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, NavbarComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './declare-loss.component.html',
  styleUrl: '../citizen-form.css',
})
export class DeclareLossComponent implements OnInit {
  private readonly api = inject(CitizenApi);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly types = signal<DocTypeRef[]>([]);
  readonly sending = signal(false);
  readonly opening = signal(false);
  readonly result = signal<DeclareLossResponse | null>(null);
  readonly today = new Date().toISOString().slice(0, 10);

  readonly form = this.fb.nonNullable.group({
    document_type_id: ['', Validators.required],
    FirstNameInDoc: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(NAME_PATTERN)]],
    LastNameInDoc: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(NAME_PATTERN)]],
    DocIdentification: ['', Validators.maxLength(50)],
    lost_place: ['', Validators.maxLength(255)],
    lost_at: [''],
  });

  readonly fieldError = fieldError;

  ngOnInit(): void {
    this.api.documentTypes().subscribe({
      next: (list) => this.types.set(list),
      error: () => this.types.set([]),
    });
  }

  /** Message d'erreur d'un champ nom/prénom (règle « lettres sans accents »). */
  nameError(control: 'FirstNameInDoc' | 'LastNameInDoc', label: string): string | null {
    const c = this.form.controls[control];
    if (c.errors?.['pattern'] && (c.touched || c.dirty)) {
      return 'Lettres sans accents et espaces uniquement, comme sur le document.';
    }
    return this.fieldError(c, label);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const typeId = Number(v.document_type_id);
    const typeName = this.types().find((t) => t.id === typeId)?.TypeName ?? 'document';

    this.sending.set(true);
    this.api
      .declareLoss({
        Title: `Perte — ${typeName}`,
        FirstNameInDoc: v.FirstNameInDoc.trim(),
        LastNameInDoc: v.LastNameInDoc.trim(),
        document_type_id: typeId,
        DocIdentification: v.DocIdentification.trim() || null,
        lost_place: v.lost_place.trim() || null,
        lost_at: v.lost_at || null,
      })
      .subscribe({
        next: (res) => {
          this.sending.set(false);
          this.result.set(res);
          this.notify.success('Déclaration enregistrée : votre récépissé est prêt.');
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        },
        error: (e) => {
          this.sending.set(false);
          void this.notify.error(e, 'Déclaration impossible');
        },
      });
  }

  openReceipt(): void {
    const receipt = this.result()?.data.certificat;
    if (!receipt?.uuid) {
      return;
    }
    this.opening.set(true);
    this.api.certificatePdf(receipt.uuid).subscribe({
      next: (blob) => {
        this.opening.set(false);
        openBlob(blob, `${receipt.certificat_number}.pdf`);
      },
      error: (e) => {
        this.opening.set(false);
        void this.notify.error(e, 'Récépissé indisponible');
      },
    });
  }

  another(): void {
    this.result.set(null);
    this.form.reset();
  }
}
