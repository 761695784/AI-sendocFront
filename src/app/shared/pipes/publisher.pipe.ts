import { Pipe, PipeTransform } from '@angular/core';

interface Publishable {
  user?: { FirstName?: string | null; LastName?: string | null } | null;
  custody?: { name?: string | null } | null;
}

/**
 * Nom affiché après « Publié par ».
 * Un document déposé au guichet n'expose jamais l'agent : on affiche la structure qui le conserve.
 */
@Pipe({ name: 'publisher' })
export class PublisherPipe implements PipeTransform {
  transform(doc: Publishable | null | undefined): string {
    if (doc?.user) {
      return `${doc.user.FirstName ?? ''} ${doc.user.LastName ?? ''}`.trim() || 'Un citoyen';
    }
    return doc?.custody?.name || 'Une structure officielle';
  }
}
