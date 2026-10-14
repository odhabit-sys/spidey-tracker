// Small geometry helpers for map overlays.

import type { Feature, Polygon } from "geojson";

const EARTH_RADIUS_M = 6_371_008.8;

/** Circle of `radiusM` metres around a point, as a GeoJSON polygon (for GPS accuracy). */
export function circlePolygon(latitude: number, longitude: number, radiusM: number, steps = 48): Feature<Polygon> {
  const lat = (latitude * Math.PI) / 180;
  const lng = (longitude * Math.PI) / 180;
  const d = radiusM / EARTH_RADIUS_M;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const pLat = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing));
    const pLng = lng + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(pLat));
    ring.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}
