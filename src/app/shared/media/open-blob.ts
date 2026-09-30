/** Ouvre un PDF (ou une image) reçu de l'API dans un nouvel onglet ; téléchargement si l'onglet est bloqué. */
export function openBlob(blob: Blob, filename = 'document.pdf'): void {
  if (typeof window === 'undefined') {
    return;
  }
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank');
  if (!tab) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
