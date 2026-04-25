import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGeolocation } from '../hooks/useGeolocation';
import { fetchNearbyPlaces, type NearbyPlace, type PlaceType } from '../services/overpassService';
import { MOCK_HOSPITALS, MOCK_USER_LOCATION } from '../mock/mockHospitals';

// ─── Config ──────────────────────────────────────────────────────────────────

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const PLACE_META: Record<PlaceType, { icon: string; label: string; color: string }> = {
  hospital:   { icon: '🏥', label: 'Hospital',   color: '#FF4A6E' },
  clinic:     { icon: '🩺', label: 'Clinic',     color: '#00E5C3' },
  pharmacy:   { icon: '💊', label: 'Pharmacy',   color: '#A78BFA' },
  doctor:     { icon: '👨‍⚕️', label: 'Doctor',   color: '#F5A623' },
  dentist:    { icon: '🦷', label: 'Dentist',    color: '#60A5FA' },
  laboratory: { icon: '🔬', label: 'Laboratory', color: '#34D399' },
};

const ALL_TYPES: PlaceType[] = ['hospital', 'clinic', 'pharmacy', 'doctor', 'dentist', 'laboratory'];

// ─── Map Marker ───────────────────────────────────────────────────────────────

function PlaceMarker({ place, isSelected, onClick }: {
  place: NearbyPlace;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meta = PLACE_META[place.placeType];
  const color = isSelected ? '#00E5C3' : meta.color;

  return (
    <Marker
      latitude={place.lat}
      longitude={place.lng}
      anchor="bottom"
      onClick={(e) => { e.originalEvent.stopPropagation(); onClick(); }}
    >
      <div
        style={{ filter: isSelected ? 'drop-shadow(0 0 8px rgba(0,229,195,0.7))' : undefined }}
        className="cursor-pointer transition-transform duration-150 hover:scale-110 active:scale-95"
      >
        <svg width="30" height="40" viewBox="0 0 30 40" fill="none">
          <path d="M15 0C6.716 0 0 6.716 0 15C0 23.284 15 40 15 40C15 40 30 23.284 30 15C30 6.716 23.284 0 15 0Z"
            fill={color} fillOpacity={isSelected ? 1 : 0.88} />
          <text x="15" y="17" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="white">
            {meta.icon}
          </text>
        </svg>
      </div>
    </Marker>
  );
}

function UserMarker({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Marker latitude={lat} longitude={lng} anchor="center">
      <div className="relative">
        <div className="w-4 h-4 rounded-full bg-teal border-2 border-white shadow-lg z-10 relative" />
        <div className="absolute inset-0 rounded-full bg-teal/40 animate-ping" />
      </div>
    </Marker>
  );
}

// ─── Detail Popup ─────────────────────────────────────────────────────────────

function PlacePopup({ place, userLat, userLng, onClose }: {
  place: NearbyPlace;
  userLat: number;
  userLng: number;
  onClose: () => void;
}) {
  const meta = PLACE_META[place.placeType];
  const gmapsDir = `https://www.google.com/maps/dir/${userLat},${userLng}/${place.lat},${place.lng}`;
  const gmapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.lat},${place.lng}`;

  return (
    <Popup
      latitude={place.lat}
      longitude={place.lng}
      anchor="bottom"
      offset={46}
      onClose={onClose}
      closeButton={false}
      className="mv-popup"
      maxWidth="300px"
    >
      <div className="bg-card border border-border-mid rounded-xl shadow-card p-4 min-w-[260px] max-w-[290px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-body px-2 py-0.5 rounded-full border"
                style={{ color: meta.color, borderColor: `${meta.color}40`, background: `${meta.color}15` }}>
                {meta.icon} {meta.label}
              </span>
              {place.emergencyAvailable && (
                <span className="badge-coral text-xs">🚨 24h</span>
              )}
            </div>
            <h3 className="font-sans font-semibold text-sm text-text-primary leading-tight">{place.name}</h3>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-lg leading-none flex-shrink-0">✕</button>
        </div>

        {/* Details */}
        <div className="space-y-1.5 mb-3">
          <p className="font-body text-xs text-text-muted flex gap-2">
            <span>📍</span><span className="flex-1">{place.address}</span>
          </p>
          {place.phone && (
            <p className="font-body text-xs text-text-muted flex gap-2">
              <span>📞</span>
              <a href={`tel:${place.phone}`} className="hover:text-teal transition-colors">{place.phone}</a>
            </p>
          )}
          {place.openingHours && (
            <p className="font-body text-xs text-text-muted flex gap-2">
              <span>⏰</span><span className="flex-1">{place.openingHours}</span>
            </p>
          )}
          <p className="font-mono text-xs text-teal">{place.distanceKm} km away</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <a href={gmapsDir} target="_blank" rel="noreferrer"
            className="btn-primary flex-1 text-center text-xs py-2">
            🗺️ Directions
          </a>
          <a href={gmapsSearch} target="_blank" rel="noreferrer"
            className="btn-ghost px-3 text-xs py-2" title="View on Maps">
            🔍
          </a>
          {place.phone && (
            <a href={`tel:${place.phone}`} className="btn-ghost px-3 text-xs py-2">📞</a>
          )}
        </div>
      </div>
    </Popup>
  );
}

// ─── List Card ────────────────────────────────────────────────────────────────

function PlaceCard({ place, isSelected, onClick }: {
  place: NearbyPlace;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meta = PLACE_META[place.placeType];

  return (
    <div onClick={onClick}
      className={`mv-card cursor-pointer transition-all duration-150 animate-fade-in
        ${isSelected ? 'border-teal/50 shadow-teal-glow' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${meta.color}20` }}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-xs font-body px-1.5 py-0.5 rounded-full"
              style={{ color: meta.color, background: `${meta.color}20` }}>
              {meta.label}
            </span>
            {place.emergencyAvailable && (
              <span className="badge-coral text-xs">🚨 24h</span>
            )}
          </div>
          <h3 className="font-sans font-medium text-sm text-text-primary leading-snug truncate">{place.name}</h3>
          <p className="font-body text-xs text-text-muted truncate">{place.address}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-xs text-teal font-semibold">{place.distanceKm} km</span>
            {place.phone && <span className="font-mono text-xs text-text-faint">{place.phone}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Banner ────────────────────────────────────────────────────────────

function StatusBanner({ status, error, onRetry }: {
  status: string;
  error: string | null;
  onRetry: () => void;
}) {
  if (status === 'granted') return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 text-sm font-body flex-shrink-0
      ${status === 'denied' ? 'bg-coral/10 border-b border-coral/30 text-coral'
      : status === 'requesting' ? 'bg-teal/10 border-b border-teal/20 text-teal'
      : 'bg-amber/10 border-b border-amber/20 text-amber'}`}
    >
      {status === 'requesting' && (
        <><span className="animate-spin">⏳</span> Getting your location…</>
      )}
      {status === 'denied' && (
        <>
          <span>⚠️</span>
          <span className="flex-1">{error} · Showing demo data for Bandra, Mumbai</span>
          <button onClick={onRetry} className="underline hover:no-underline flex-shrink-0">Retry</button>
        </>
      )}
      {status === 'unavailable' && (
        <><span>⚠️</span> Geolocation not available · Showing demo data</>
      )}
      {status === 'idle' && (
        <><span>📍</span> Waiting for location…</>
      )}
    </div>
  );
}

// ─── Loading overlay ──────────────────────────────────────────────────────────

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 bg-void/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
      <div className="w-12 h-12 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
      <p className="font-mono text-sm text-teal">{message}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function toNearbyPlace(h: typeof MOCK_HOSPITALS[number]): NearbyPlace {
  return {
    id: h.id,
    name: h.name,
    placeType: h.type === 'diagnostic' ? 'laboratory' : h.type,
    lat: h.lat,
    lng: h.lng,
    address: h.address,
    phone: h.phone,
    openingHours: h.timings,
    emergencyAvailable: h.emergencyAvailable,
    distanceKm: h.distanceKm,
    tags: {},
  };
}

export default function Locator() {
  const { location, status: geoStatus, error: geoError, request: requestGeo } = useGeolocation(true);

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [radius, setRadius] = useState(3000);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<PlaceType>>(new Set());
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  const mapRef = useRef<any>(null);

  const userLat = location?.lat ?? MOCK_USER_LOCATION.lat;
  const userLng = location?.lng ?? MOCK_USER_LOCATION.lng;
  const usingRealLocation = geoStatus === 'granted' && !!location;

  // Fetch from Overpass when we have a location
  const doFetch = useCallback(async (lat: number, lng: number, r: number) => {
    setFetchStatus('loading');
    setFetchError(null);
    try {
      const results = await fetchNearbyPlaces(lat, lng, r);
      if (results.length === 0) {
        // OSM data can be sparse — fall back to mock + notify
        setPlaces(MOCK_HOSPITALS.map(toNearbyPlace));
        setFetchError('No OpenStreetMap data found in this area — showing demo data');
      } else {
        setPlaces(results);
      }
      setFetchStatus('done');
    } catch (e: any) {
      console.warn('Overpass fetch failed:', e);
      setPlaces(MOCK_HOSPITALS.map(toNearbyPlace));
      setFetchError('Could not reach OpenStreetMap API — showing demo data');
      setFetchStatus('error');
    }
  }, []);

  // Re-fetch when location becomes available or radius changes
  useEffect(() => {
    if (geoStatus === 'granted' && location) {
      doFetch(location.lat, location.lng, radius);
    } else if (geoStatus === 'denied' || geoStatus === 'unavailable') {
      setPlaces(MOCK_HOSPITALS.map(toNearbyPlace));
      setFetchStatus('done');
    }
  }, [geoStatus, location, radius, doFetch]);

  // Fly map to user when location arrives
  useEffect(() => {
    if (location && mapRef.current) {
      mapRef.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 14,
        duration: 1200,
      });
    }
  }, [location]);

  const selectedPlace = places.find((p) => p.id === selectedId) ?? null;

  const filtered = places.filter((p) => {
    const matchSearch = !search
      || p.name.toLowerCase().includes(search.toLowerCase())
      || p.address.toLowerCase().includes(search.toLowerCase())
      || p.placeType.includes(search.toLowerCase());
    const matchType = activeTypes.size === 0 || activeTypes.has(p.placeType);
    const matchEmergency = !emergencyOnly || p.emergencyAvailable;
    return matchSearch && matchType && matchEmergency;
  });

  const handleSelect = (place: NearbyPlace) => {
    setSelectedId(place.id);
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 16, duration: 700 });
  };

  const toggleType = (t: PlaceType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  // Count by type for badges
  const typeCounts = ALL_TYPES.reduce((acc, t) => {
    acc[t] = places.filter((p) => p.placeType === t).length;
    return acc;
  }, {} as Record<PlaceType, number>);

  return (
    <div className="flex flex-col h-screen">
      {/* Geo status banner */}
      <StatusBanner status={geoStatus} error={geoError} onRetry={requestGeo} />

      {/* Soft fetch error banner */}
      {fetchError && fetchStatus !== 'loading' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber/10 border-b border-amber/20 text-amber text-xs font-body flex-shrink-0">
          <span>⚠️</span>{fetchError}
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border-dim bg-surface/80 backdrop-blur-sm flex-shrink-0 flex-wrap gap-y-2">
        <div>
          <h1 className="font-sans font-bold text-lg text-text-primary">Nearby Healthcare</h1>
          <p className="font-body text-xs text-text-muted">
            {usingRealLocation
              ? `📍 Your location · ${filtered.length} of ${places.length} places`
              : `📍 Demo: Bandra, Mumbai · ${filtered.length} results`}
          </p>
        </div>

        {/* Radius selector */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-mono text-xs text-text-faint">Radius</span>
          {[1000, 2000, 3000, 5000].map((r) => (
            <button key={r}
              onClick={() => setRadius(r)}
              className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all
                ${radius === r ? 'bg-teal text-teal-text' : 'bg-surface border border-border-dim text-text-muted hover:border-teal/40'}`}
            >
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </button>
          ))}
        </div>

        {/* Emergency toggle */}
        <button
          onClick={() => setEmergencyOnly((v) => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all flex-shrink-0
            ${emergencyOnly ? 'bg-coral text-coral-text' : 'bg-surface border border-border-mid text-text-muted hover:border-coral/40'}`}
        >
          🚨 {emergencyOnly ? '24h Only' : 'All'}
        </button>
      </div>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────── */}
        <div className="w-80 flex flex-col border-r border-border-dim bg-void flex-shrink-0">
          {/* Search */}
          <div className="px-4 py-3 border-b border-border-dim">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint text-sm">🔍</span>
              <input
                className="mv-input pl-8 text-sm"
                placeholder="Hospital, pharmacy, clinic…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Type filter */}
          <div className="px-4 py-3 border-b border-border-dim">
            <p className="font-body text-xs text-text-faint uppercase tracking-wider mb-2">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((t) => {
                const meta = PLACE_META[t];
                const count = typeCounts[t];
                if (count === 0) return null;
                return (
                  <button key={t} onClick={() => toggleType(t)}
                    className={`px-2.5 py-1 rounded-full text-xs font-body transition-all flex items-center gap-1
                      ${activeTypes.has(t) ? 'font-medium' : 'bg-surface border border-border-dim text-text-faint hover:border-border-mid'}`}
                    style={activeTypes.has(t) ? {
                      background: `${meta.color}25`, color: meta.color, borderColor: `${meta.color}50`, border: '1px solid'
                    } : {}}
                  >
                    {meta.icon} {meta.label}
                    <span className="opacity-60">({count})</span>
                  </button>
                );
              })}
              {activeTypes.size > 0 && (
                <button onClick={() => setActiveTypes(new Set())}
                  className="text-xs text-text-faint hover:text-coral px-2 py-1 transition-colors">
                  Clear ✕
                </button>
              )}
            </div>
          </div>

          {/* Results list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {fetchStatus === 'loading' && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
                <p className="font-mono text-xs text-teal">Searching nearby…</p>
              </div>
            )}
            {fetchStatus !== 'loading' && filtered.length === 0 && (
              <div className="text-center py-12">
                <span className="text-3xl block mb-2">🔍</span>
                <p className="font-body text-sm text-text-muted">No results — try adjusting filters or radius</p>
              </div>
            )}
            {fetchStatus !== 'loading' && filtered.map((p) => (
              <PlaceCard key={p.id} place={p} isSelected={selectedId === p.id} onClick={() => handleSelect(p)} />
            ))}
          </div>

          {/* Refresh button */}
          {usingRealLocation && (
            <div className="p-3 border-t border-border-dim">
              <button
                onClick={() => doFetch(userLat, userLng, radius)}
                disabled={fetchStatus === 'loading'}
                className="w-full btn-ghost text-sm disabled:opacity-50"
              >
                {fetchStatus === 'loading' ? '⏳ Refreshing…' : '🔄 Refresh nearby places'}
              </button>
            </div>
          )}
        </div>

        {/* ── Map ──────────────────────────────────────────── */}
        <div className="flex-1 relative">
          {fetchStatus === 'loading' && <LoadingOverlay message="Loading nearby places from OpenStreetMap…" />}

          <Map
            ref={mapRef}
            mapStyle={MAP_STYLE}
            initialViewState={{ latitude: userLat, longitude: userLng, zoom: 14 }}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
            onClick={() => setSelectedId(null)}
          >
            <NavigationControl position="top-right" />
            <GeolocateControl
              position="top-right"
              trackUserLocation
              onGeolocate={(e) => {
                // If the built-in GeolocateControl fires, re-fetch with its coords
                doFetch(e.coords.latitude, e.coords.longitude, radius);
              }}
            />

            {/* User dot */}
            <UserMarker lat={userLat} lng={userLng} />

            {/* Place markers */}
            {filtered.map((p) => (
              <PlaceMarker key={p.id} place={p} isSelected={selectedId === p.id} onClick={() => handleSelect(p)} />
            ))}

            {/* Popup */}
            {selectedPlace && (
              <PlacePopup
                place={selectedPlace}
                userLat={userLat}
                userLng={userLng}
                onClose={() => setSelectedId(null)}
              />
            )}
          </Map>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 pointer-events-none max-w-sm">
            {ALL_TYPES.filter((t) => typeCounts[t] > 0).map((t) => {
              const meta = PLACE_META[t];
              return (
                <div key={t} className="bg-card/90 backdrop-blur-sm border border-border-dim rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                  <span className="font-mono text-xs text-text-muted">{meta.label}</span>
                </div>
              );
            })}
            <div className="bg-card/90 backdrop-blur-sm border border-border-dim rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal animate-pulse flex-shrink-0" />
              <span className="font-mono text-xs text-text-muted">You</span>
            </div>
          </div>

          {/* Data source badge */}
          <div className="absolute bottom-4 right-4 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm border border-border-dim rounded-lg px-2.5 py-1.5">
              <span className="font-mono text-xs text-text-faint">
                {usingRealLocation ? '🌐 Live · OpenStreetMap' : '📋 Demo data'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
