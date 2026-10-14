const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Great-circle (straight-line) distance in metres, Haversine formula. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial compass bearing from `a` to `b`, degrees clockwise from north (0-360). */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const φ1 = rad(a.latitude);
  const φ2 = rad(b.latitude);
  const Δλ = rad(b.longitude - a.longitude);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Round to a precision GPS can honestly support: "82 M", "620 M", "1.4 KM", "12 KM". */
export function formatDistance(meters: number): string {
  if (meters < 100) return `${Math.max(5, Math.round(meters / 5) * 5)} M`;
  if (Math.round(meters / 10) * 10 < 1000) return `${Math.round(meters / 10) * 10} M`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1)} KM`;
  return `${Math.round(meters / 1000)} KM`;
}

/** GPS accuracy radius, rounded: "± 8 M", "± 1.2 KM". */
export function formatAccuracy(meters: number): string {
  return meters < 1000 ? `± ${Math.max(1, Math.round(meters))} M` : `± ${(meters / 1000).toFixed(1)} KM`;
}
