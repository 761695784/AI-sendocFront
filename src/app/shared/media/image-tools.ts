/**
 * Réduction des photos avant envoi : une photo de téléphone (3 à 8 Mo) passe à ~300-600 Ko,
 * ce qui accélère l'envoi sur les réseaux mobiles sans gêner la lecture OCR (2000 px suffisent).
 */
export async function shrinkImage(file: File, maxSide = 2000, quality = 0.85): Promise<Blob> {
  if (typeof document === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000 && file.type === 'image/jpeg') {
      bitmap.close?.();
      return file; // déjà léger
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // navigateur ancien : on envoie l'original
  }
}

/** Formats acceptés par l'API pour une photo de pièce. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function checkImage(file: File, maxMb: number): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Seules les photos JPG, PNG ou WEBP sont acceptées.';
  }
  if (file.size > maxMb * 1024 * 1024 * 4) {
    // tolérance : la photo est réduite avant l'envoi
    return `Photo trop lourde (maximum ${maxMb * 4} Mo).`;
  }
  return null;
}
