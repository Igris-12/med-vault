/**
 * Overpass API service — fetches real hospitals, clinics, pharmacies
 * from OpenStreetMap data. Zero cost, no API key, global coverage.
 */

export type PlaceType = 'hospital' | 'clinic' | 'pharmacy' | 'doctor' | 'dentist' | 'laboratory';

export interface NearbyPlace {
  id: string;
  name: string;
  placeType: PlaceType;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  emergencyAvailable: boolean;
  distanceKm: number;
  /** Raw OSM tags */
  tags: Record<string, string>;
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

const AMENITY_MAP: Record<string, PlaceType> = {
  hospital: 'hospital',
  clinic: 'clinic',
  pharmacy: 'pharmacy',
  doctors: 'doctor',
  dentist: 'dentist',
  laboratory: 'laboratory',
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function buildAddress(tags: Record<string, string>): string {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'] || tags['addr:city'],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : tags['addr:full'] || 'See Google Maps for address';
}

function normalizeElement(
  el: any,
  userLat: number,
  userLng: number
): NearbyPlace | null {
  const tags: Record<string, string> = el.tags || {};
  const amenity = tags.amenity;
  const placeType = AMENITY_MAP[amenity];
  if (!placeType) return null;

  const name = tags.name || tags['name:en'] || capitalize(amenity);

  // For ways/relations, OSM returns a `center` property
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!lat || !lng) return null;

  return {
    id: `${el.type}-${el.id}`,
    name,
    placeType,
    lat,
    lng,
    address: buildAddress(tags),
    phone: tags['phone'] || tags['contact:phone'],
    website: tags['website'] || tags['contact:website'],
    openingHours: tags['opening_hours'],
    emergencyAvailable:
      tags['emergency'] === 'yes' ||
      placeType === 'hospital' ||
      (tags['healthcare:speciality'] || '').includes('emergency'),
    distanceKm: haversineKm(userLat, userLng, lat, lng),
    tags,
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters = 3000
): Promise<NearbyPlace[]> {
  const query = `
[out:json][timeout:20];
(
  node["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist|laboratory)$"](around:${radiusMeters},${lat},${lng});
  way["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist|laboratory)$"](around:${radiusMeters},${lat},${lng});
  relation["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist|laboratory)$"](around:${radiusMeters},${lat},${lng});
);
out center tags;
`.trim();

  const res = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

  const json = await res.json();
  const elements: any[] = json.elements || [];

  return elements
    .map((el) => normalizeElement(el, lat, lng))
    .filter((p): p is NearbyPlace => p !== null && !!p.name)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
