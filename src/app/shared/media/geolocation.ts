/** Position GPS du téléphone (avec l'accord de la personne). Limitée au Sénégal par l'API. */
export interface GpsPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function currentPosition(timeoutMs = 15000): Promise<GpsPoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('La localisation n’est pas disponible sur cet appareil.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: Math.round(pos.coords.latitude * 1e6) / 1e6,
          longitude: Math.round(pos.coords.longitude * 1e6) / 1e6,
          accuracy: Math.round(pos.coords.accuracy),
        }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Vous avez refusé la localisation. Vous pouvez choisir le département à la place.'
              : 'Position introuvable pour le moment. Choisissez le département à la place.',
          ),
        ),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

/** L'API n'accepte que des points situés au Sénégal (latitude 12 à 17, longitude −18 à −11). */
export function isInSenegal(p: { latitude: number; longitude: number }): boolean {
  return p.latitude >= 12 && p.latitude <= 17 && p.longitude >= -18 && p.longitude <= -11;
}
