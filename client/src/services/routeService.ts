/**
 * OSRM Routing Service — free, no API key, open source routing
 * Uses the public OSRM demo server (router.project-osrm.org)
 */

export interface RouteResult {
  geometry: GeoJSON.LineString;
  distanceMeters: number;
  durationSeconds: number;
}

export async function getRoute(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  mode: 'driving' | 'walking' = 'driving'
): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/${mode}/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&overview=full`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found');
  const route = data.routes[0];
  return {
    geometry: route.geometry as GeoJSON.LineString,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

/** Format meters → "1.2 km" or "850 m" */
export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

/** Format seconds → "5 min" or "1 h 12 min" */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

/** Create a GeoJSON Polygon approximating a circle */
export function createRadiusCircle(
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  points = 72
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  // Approximate degrees per meter at this latitude
  const latDeg = radiusMeters / 111320;
  const lngDeg = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    coords.push([
      centerLng + lngDeg * Math.cos(angle),
      centerLat + latDeg * Math.sin(angle),
    ]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}
