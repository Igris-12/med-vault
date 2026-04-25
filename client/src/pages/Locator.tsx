import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayer, FillLayer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { fetchNearbyPlaces, type NearbyPlace, type PlaceType } from '../services/overpassService';
import { getRoute, formatDistance, formatDuration, createRadiusCircle, type RouteStep } from '../services/routeService';
import { getDoctorsForHospital, type Doctor } from '../mock/mockDoctors';


// ─── Suggestions derived from user health data ────────────────────────────────
const USER_SUGGESTIONS = [
  { specialty: 'Endocrinology', reason: 'HbA1c 7.9% — diabetes management', icon: '🔬', urgency: 'high' as const },
  { specialty: 'Nephrology',    reason: 'Microalbuminuria + rising creatinine', icon: '💧', urgency: 'high' as const },
  { specialty: 'Cardiology',   reason: 'Hypertension history + high LDL', icon: '❤️', urgency: 'medium' as const },
  { specialty: 'Ophthalmology', reason: 'Annual diabetic retinopathy screening due', icon: '👁️', urgency: 'low' as const },
];

// ─── Recently visited helpers ─────────────────────────────────────────────────
const VISITED_KEY = 'medvault_visited_hospitals';
function loadVisited(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) || '[]')); } catch { return new Set(); }
}
function saveVisited(ids: Set<string>) {
  localStorage.setItem(VISITED_KEY, JSON.stringify([...ids]));
}

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

// ─── Markers ─────────────────────────────────────────────────────────────────

function PlaceMarker({ place, isSelected, isVisited, onClick }: {
  place: NearbyPlace; isSelected: boolean; isVisited: boolean; onClick: () => void;
}) {
  const meta = PLACE_META[place.placeType];
  const color = isSelected ? '#00E5C3' : isVisited ? '#F5A623' : meta.color;
  return (
    <Marker latitude={place.lat} longitude={place.lng} anchor="bottom"
      onClick={(e) => { e.originalEvent.stopPropagation(); onClick(); }}>
      <div style={{ filter: isSelected ? 'drop-shadow(0 0 10px rgba(0,229,195,0.8))' : isVisited ? 'drop-shadow(0 0 6px rgba(245,166,35,0.6))' : undefined }}
        className="cursor-pointer transition-transform hover:scale-110 active:scale-95">
        <svg width="30" height="40" viewBox="0 0 30 40" fill="none">
          <path d="M15 0C6.716 0 0 6.716 0 15C0 23.284 15 40 15 40C15 40 30 23.284 30 15C30 6.716 23.284 0 15 0Z"
            fill={color} fillOpacity={0.9} />
          {isVisited && !isSelected && (
            <circle cx="15" cy="15" r="12" fill="none" stroke="#F5A623" strokeWidth="1.5" strokeDasharray="3 2" />
          )}
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
        <div className="w-5 h-5 rounded-full bg-teal border-2 border-white shadow-xl z-10 relative" />
        <div className="absolute inset-0 rounded-full bg-teal/40 animate-ping" />
        <div className="absolute -inset-3 rounded-full bg-teal/10 animate-ping" style={{ animationDelay: '0.3s' }} />
      </div>
    </Marker>
  );
}

// ─── Popup ────────────────────────────────────────────────────────────────────

// ─── Doctor Card ──────────────────────────────────────────────────────────────

function DoctorCard({ doc }: { doc: Doctor }) {
  const urgency = USER_SUGGESTIONS.find(s => s.specialty === doc.specialty);
  return (
    <div className="px-4 py-3 border-b border-border-dim hover:bg-surface/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-teal/15 flex items-center justify-center font-bold text-teal text-sm flex-shrink-0">
          {doc.name.split(' ').slice(-1)[0].charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-sans font-semibold text-sm text-text-primary">{doc.name}</p>
            {urgency && <span className="text-xs px-1.5 py-0.5 rounded-full bg-coral/15 text-coral font-body">Recommended</span>}
          </div>
          <p className="font-body text-xs text-text-muted">{doc.specialty} · {doc.experienceYears}y exp</p>
          <p className="font-body text-xs text-text-faint">{doc.qualification}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="font-mono text-xs text-amber">★ {doc.rating} <span className="text-text-faint">({doc.reviewCount})</span></span>
            <span className="font-mono text-xs text-teal">₹{doc.consultationFee}</span>
            <span className="font-body text-xs text-text-faint">{doc.nextAvailable}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-xs text-text-faint">{doc.source}</span>
        <span className="font-body text-xs text-text-faint">{doc.languages.join(' · ')}</span>
      </div>
    </div>
  );
}

function PlacePopup({ place, onRoute, onClose, isVisited }: {
  place: NearbyPlace;
  onRoute: () => void;
  onClose: () => void;
  isVisited: boolean;
}) {
  const [tab, setTab] = useState<'info' | 'doctors'>('info');
  const meta = PLACE_META[place.placeType];
  const doctors = getDoctorsForHospital(place.id);

  return (
    <Popup latitude={place.lat} longitude={place.lng} anchor="bottom" offset={46}
      onClose={onClose} closeButton={false} className="mv-popup" maxWidth="320px">
      <div className="bg-card border border-border-mid rounded-xl overflow-hidden min-w-[290px]">
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full border font-body"
                  style={{ color: meta.color, borderColor: `${meta.color}40`, background: `${meta.color}15` }}>
                  {meta.icon} {meta.label}
                </span>
                {place.emergencyAvailable && <span className="badge-coral text-xs">🚨 24h</span>}
                {isVisited && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber/20 text-amber font-body">⭐ Visited</span>}
              </div>
              <h3 className="font-sans font-semibold text-sm text-text-primary leading-tight">{place.name}</h3>
            </div>
            <button onClick={onClose} className="text-text-faint hover:text-text-primary text-base flex-shrink-0">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 border-b border-border-dim">
            {(['info', 'doctors'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-sans font-medium capitalize transition-all border-b-2 -mb-px
                  ${tab === t ? 'border-teal text-teal' : 'border-transparent text-text-faint hover:text-text-muted'}`}>
                {t === 'doctors' ? `👨‍⚕️ Doctors${doctors.length > 0 ? ` (${doctors.length})` : ''}` : '📋 Info'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === 'info' && (
          <div className="px-4 pb-4">
            <div className="space-y-1 mb-3 text-xs font-body text-text-muted">
              <p className="flex gap-2"><span>📍</span><span>{place.address}</span></p>
              {place.phone && <p className="flex gap-2"><span>📞</span>
                <a href={`tel:${place.phone}`} className="hover:text-teal">{place.phone}</a></p>}
              {place.openingHours && <p className="flex gap-2"><span>⏰</span><span>{place.openingHours}</span></p>}
              <p className="font-mono text-teal font-semibold">{place.distanceKm} km away</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onRoute} className="btn-primary flex-1 text-xs py-2">🗺️ Get Directions</button>
              {place.phone && <a href={`tel:${place.phone}`} className="btn-ghost px-3 text-xs py-2">📞</a>}
            </div>
          </div>
        )}

        {tab === 'doctors' && (
          <div className="max-h-64 overflow-y-auto">
            {doctors.length === 0
              ? <p className="text-center py-6 font-body text-sm text-text-faint px-4">No doctor data available for this facility</p>
              : doctors.map((d) => <DoctorCard key={d.id} doc={d} />)
            }
            <p className="text-xs text-text-faint font-mono text-center py-2 border-t border-border-dim">
              Sources: {[...new Set(doctors.map(d => d.source))].join(' · ')}
            </p>
          </div>
        )}
      </div>
    </Popup>
  );
}

// ─── List Card ────────────────────────────────────────────────────────────────

function PlaceCard({ place, isSelected, isVisited, onClick }: {
  place: NearbyPlace; isSelected: boolean; isVisited: boolean; onClick: () => void;
}) {
  const meta = PLACE_META[place.placeType];
  return (
    <div onClick={onClick}
      className={`mv-card cursor-pointer transition-all duration-150 ${isSelected ? 'border-teal/50 shadow-teal-glow' : isVisited ? 'border-amber/40' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${isVisited ? '#F5A623' : meta.color}20` }}>{meta.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-xs px-1.5 py-0.5 rounded-full font-body"
              style={{ color: meta.color, background: `${meta.color}20` }}>{meta.label}</span>
            {place.emergencyAvailable && <span className="badge-coral text-xs">🚨</span>}
            {isVisited && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber/20 text-amber font-body">⭐ Visited</span>}
          </div>
          <p className="font-sans font-medium text-sm text-text-primary truncate">{place.name}</p>
          <p className="font-body text-xs text-text-muted truncate">{place.address}</p>
          <div className="flex gap-3 mt-1">
            <span className="font-mono text-xs text-teal font-semibold">{place.distanceKm} km</span>
            {place.phone && <span className="font-mono text-xs text-text-faint">{place.phone}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Permission Gate ──────────────────────────────────────────────────────────

function PermissionGate({ onAllow, onDeny }: { onAllow: () => void; onDeny: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-void px-6 text-center">
      {/* Animated pulse rings */}
      <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
        <div className="absolute w-32 h-32 rounded-full bg-teal/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute w-24 h-24 rounded-full bg-teal/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
        <div className="absolute w-16 h-16 rounded-full bg-teal/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.8s' }} />
        <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center text-2xl relative z-10 shadow-teal-glow">
          📍
        </div>
      </div>

      <h1 className="font-sans font-bold text-3xl text-text-primary mb-3">
        Find Healthcare Near You
      </h1>
      <p className="font-body text-base text-text-muted max-w-sm mb-2 leading-relaxed">
        MedVault will use your <span className="text-teal font-medium">live GPS location</span> to find
        real hospitals, pharmacies, and clinics near you using OpenStreetMap data.
      </p>
      <p className="font-mono text-xs text-text-faint mb-10">
        Your location is never stored or sent to our servers
      </p>

      {/* What we'll show */}
      <div className="grid grid-cols-3 gap-4 mb-10 max-w-sm w-full">
        {[
          { icon: '🏥', label: 'Hospitals' },
          { icon: '💊', label: 'Pharmacies' },
          { icon: '🩺', label: 'Clinics' },
          { icon: '👨‍⚕️', label: 'Doctors' },
          { icon: '🦷', label: 'Dentists' },
          { icon: '🔬', label: 'Labs' },
        ].map(({ icon, label }) => (
          <div key={label} className="mv-card text-center py-3 px-2">
            <span className="text-2xl block mb-1">{icon}</span>
            <span className="font-body text-xs text-text-muted">{label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onAllow}
        className="btn-primary text-base px-10 py-4 rounded-2xl shadow-teal-glow mb-4 hover:scale-105 active:scale-95 transition-transform"
      >
        📍 Allow Location & Find Nearby
      </button>
      <button
        onClick={onDeny}
        className="font-body text-sm text-text-faint hover:text-text-muted transition-colors"
      >
        No thanks, use demo data instead
      </button>
    </div>
  );
}

// ─── Fetching Screen ──────────────────────────────────────────────────────────

function FetchingScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-void gap-6">
      <div className="relative w-20 h-20">
        <div className="w-20 h-20 border-2 border-teal/20 border-t-teal rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">📍</div>
      </div>
      <div className="text-center">
        <p className="font-sans font-semibold text-text-primary text-lg mb-1">{message}</p>
        <p className="font-mono text-xs text-text-faint">Please allow location access in your browser</p>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

type AppState = 'gate' | 'requesting' | 'fetching' | 'ready' | 'error';

export default function Locator() {
  const [appState, setAppState] = useState<AppState>('gate');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [radius, setRadius] = useState(3000);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<PlaceType>>(new Set());
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(loadVisited);

  // Routing state
  const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.LineString | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string; dest: string } | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);

  const mapRef = useRef<any>(null);

  const doFetch = useCallback(async (lat: number, lng: number, r: number) => {
    setAppState('fetching');
    try {
      const results = await fetchNearbyPlaces(lat, lng, r);
      setPlaces(results);
      setAppState('ready');
    } catch (e: any) {
      setErrorMsg('Could not fetch from OpenStreetMap. Please check your internet connection.');
      setAppState('error');
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      setAppState('error');
      return;
    }
    setAppState('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        doFetch(lat, lng, radius);
      },
      (err) => {
        const msg = err.code === 1
          ? 'Location access was denied. Please allow location in your browser settings and try again.'
          : 'Could not get your location. Please check your GPS or network.';
        setErrorMsg(msg);
        setAppState('error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [doFetch, radius]);

  // Fly to user when map + location ready
  useEffect(() => {
    if (appState === 'ready' && userLat && userLng && mapRef.current) {
      mapRef.current.flyTo({ center: [userLng, userLat], zoom: 14, duration: 1000 });
    }
  }, [appState, userLat, userLng]);

  // Route handler — OSRM, drawn on map
  const handleRoute = useCallback(async (place: NearbyPlace, uLat: number, uLng: number) => {
    // Mark as visited
    setVisited((prev) => { const next = new Set(prev); next.add(place.id); saveVisited(next); return next; });
    setRouteLoading(true);
    setRouteGeoJSON(null);
    setRouteInfo(null);
    setRouteSteps([]);
    try {
      const result = await getRoute(uLng, uLat, place.lng, place.lat);
      setRouteGeoJSON(result.geometry);
      setRouteSteps(result.steps);
      setRouteInfo({ distance: formatDistance(result.distanceMeters), duration: formatDuration(result.durationSeconds), dest: place.name });
      const coords = result.geometry.coordinates as [number, number][];
      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      mapRef.current?.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, duration: 800 }
      );
    } catch {
      setRouteInfo({ distance: '—', duration: 'Route unavailable', dest: place.name });
    } finally {
      setRouteLoading(false);
    }
  }, []);

  const selectedPlace = places.find((p) => p.id === selectedId) ?? null;

  const filtered = places.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.address.toLowerCase().includes(search.toLowerCase()) &&
        !p.placeType.includes(search.toLowerCase())) return false;
    if (activeTypes.size > 0 && !activeTypes.has(p.placeType)) return false;
    if (emergencyOnly && !p.emergencyAvailable) return false;
    return true;
  });

  const typeCounts = ALL_TYPES.reduce((acc, t) => {
    acc[t] = places.filter((p) => p.placeType === t).length;
    return acc;
  }, {} as Record<PlaceType, number>);

  // ── States: gate / requesting / fetching / error ──────────────────────────

  if (appState === 'gate') {
    return <PermissionGate onAllow={requestLocation} onDeny={() => {
      // Load demo data (Panaji, Goa)
      setUserLat(15.4909); setUserLng(73.8278);
      doFetch(15.4909, 73.8278, radius);
    }} />;
  }

  if (appState === 'requesting') {
    return <FetchingScreen message="Getting your location…" />;
  }

  if (appState === 'fetching') {
    return <FetchingScreen message="Finding nearby healthcare…" />;
  }

  if (appState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-void gap-6 px-6 text-center">
        <span className="text-5xl">⚠️</span>
        <div>
          <h2 className="font-sans font-bold text-xl text-text-primary mb-2">Something went wrong</h2>
          <p className="font-body text-sm text-text-muted max-w-sm">{errorMsg}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={requestLocation} className="btn-primary px-6 py-3">
            🔄 Try Again
          </button>
          <button onClick={() => { setUserLat(15.4909); setUserLng(73.8278); doFetch(15.4909, 73.8278, radius); }}
            className="btn-ghost px-6 py-3">
            Use Panaji, Goa Demo
          </button>
        </div>
      </div>
    );
  }

  // ── Ready: show full map ──────────────────────────────────────────────────

  const lat = userLat!;
  const lng = userLng!;

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-border-dim bg-surface/80 backdrop-blur-sm flex-shrink-0 flex-wrap gap-y-2">
        <div>
          <h1 className="font-sans font-bold text-lg text-text-primary flex items-center gap-2">
            <span className="text-teal">📍</span> Nearby Healthcare
          </h1>
          <p className="font-body text-xs text-text-muted">
            {lat.toFixed(4)}°N, {lng.toFixed(4)}°E · {filtered.length} of {places.length} places
          </p>
        </div>

        {/* Radius */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-mono text-xs text-text-faint">Radius</span>
          {[1000, 2000, 3000, 5000].map((r) => (
            <button key={r} onClick={() => { setRadius(r); doFetch(lat, lng, r); }}
              className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all
                ${radius === r ? 'bg-teal text-teal-text' : 'bg-surface border border-border-dim text-text-muted hover:border-teal/40'}`}>
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </button>
          ))}
        </div>

        {/* Emergency */}
        <button onClick={() => setEmergencyOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all flex-shrink-0
            ${emergencyOnly ? 'bg-coral text-coral-text' : 'bg-surface border border-border-mid text-text-muted hover:border-coral/40'}`}>
          🚨 {emergencyOnly ? '24h Only' : 'All Types'}
        </button>
      </div>

      {/* Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex flex-col border-r border-border-dim bg-void flex-shrink-0">
          {/* Suggestions based on user health data */}
          {!routeInfo && !routeLoading && (
            <div className="px-4 py-3 border-b border-border-dim bg-coral/5">
              <p className="font-sans text-xs font-semibold text-coral uppercase tracking-wider mb-2">💡 Recommended for You</p>
              <div className="space-y-1.5">
                {USER_SUGGESTIONS.map((s) => {
                  const match = places.find(p =>
                    p.tags?.['healthcare:speciality']?.toLowerCase().includes(s.specialty.toLowerCase()) ||
                    p.name.toLowerCase().includes(s.specialty.toLowerCase())
                  );
                  return (
                    <div key={s.specialty} className="flex items-start gap-2">
                      <span className="text-base flex-shrink-0">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-body text-xs font-medium text-text-primary">{s.specialty}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                            s.urgency === 'high' ? 'bg-coral/15 text-coral' :
                            s.urgency === 'medium' ? 'bg-amber/15 text-amber' : 'bg-teal/15 text-teal'
                          }`}>{s.urgency}</span>
                        </div>
                        <p className="font-body text-xs text-text-faint truncate">{s.reason}</p>
                      </div>
                      {match && (
                        <button onClick={() => { setSelectedId(match.id); mapRef.current?.flyTo({ center: [match.lng, match.lat], zoom: 16, duration: 700 }); }}
                          className="text-xs text-teal hover:underline flex-shrink-0">View →</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search */}}
          <div className="px-4 py-3 border-b border-border-dim">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">🔍</span>
              <input className="mv-input pl-9 text-sm" placeholder="Search name, type…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Type chips */}
          <div className="px-4 py-3 border-b border-border-dim">
            <p className="font-body text-xs text-text-faint uppercase tracking-wider mb-2">Filter by type</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.filter((t) => typeCounts[t] > 0).map((t) => {
                const meta = PLACE_META[t];
                return (
                  <button key={t} onClick={() => setActiveTypes((prev) => {
                    const next = new Set(prev);
                    next.has(t) ? next.delete(t) : next.add(t);
                    return next;
                  })}
                    className="px-2.5 py-1 rounded-full text-xs font-body transition-all flex items-center gap-1"
                    style={activeTypes.has(t)
                      ? { background: `${meta.color}25`, color: meta.color, border: `1px solid ${meta.color}60` }
                      : { background: 'var(--color-surface)', color: 'var(--color-text-faint)', border: '1px solid var(--color-border-dim)' }
                    }>
                    {meta.icon} {meta.label} <span className="opacity-50">({typeCounts[t]})</span>
                  </button>
                );
              })}
              {activeTypes.size > 0 && (
                <button onClick={() => setActiveTypes(new Set())}
                  className="text-xs text-text-faint hover:text-coral transition-colors px-1">Clear ✕</button>
              )}
            </div>
          </div>

          {/* List OR Directions panel */}
          <div className="flex-1 overflow-y-auto">
            {routeInfo || routeLoading ? (
              /* ── Directions Panel ── */
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border-dim bg-teal/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-sans font-semibold text-sm text-teal">🗺️ Directions</span>
                    <button onClick={() => { setRouteGeoJSON(null); setRouteInfo(null); setRouteSteps([]); }}
                      className="text-xs text-text-faint hover:text-coral transition-colors">✕ Clear</button>
                  </div>
                  {routeInfo && (
                    <div>
                      <p className="font-sans text-xs font-medium text-text-primary truncate">→ {routeInfo.dest}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="font-mono text-sm font-bold text-teal">{routeInfo.distance}</span>
                        <span className="font-mono text-sm text-text-muted">{routeInfo.duration}</span>
                        <span className="font-body text-xs text-text-faint self-end">driving</span>
                      </div>
                    </div>
                  )}
                  {routeLoading && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-3 h-3 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
                      <span className="font-mono text-xs text-teal">Calculating route…</span>
                    </div>
                  )}
                </div>

                {/* Step list */}
                <div className="flex-1 overflow-y-auto divide-y divide-border-dim">
                  {routeSteps.map((step, i) => (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3
                      ${step.instruction === 'You have arrived' ? 'bg-teal/10' : 'hover:bg-surface/50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base
                        ${step.instruction === 'You have arrived' ? 'bg-teal/20 text-teal'
                        : i === 0 ? 'bg-coral/15 text-coral' : 'bg-surface text-text-muted'}`}>
                        {step.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-text-primary leading-snug">{step.instruction}</p>
                        {step.distanceMeters > 0 && step.instruction !== 'You have arrived' && (
                          <p className="font-mono text-xs text-text-faint mt-0.5">{formatDistance(step.distanceMeters)}</p>
                        )}
                      </div>
                      <span className="font-mono text-xs text-text-faint flex-shrink-0 w-5 text-right">{i + 1}</span>
                    </div>
                  ))}
                  {routeInfo && routeSteps.length === 0 && !routeLoading && (
                    <p className="text-center py-8 font-body text-sm text-text-faint">No step data available</p>
                  )}
                </div>
              </div>
            ) : (
              /* ── Place List ── */
              <div className="p-3 space-y-2">
                {filtered.length === 0
                  ? <div className="text-center py-12"><span className="text-3xl">🔍</span>
                      <p className="font-body text-sm text-text-muted mt-2">No results — adjust filters</p></div>
                  : filtered.map((p) => (
                      <PlaceCard key={p.id} place={p} isSelected={selectedId === p.id} isVisited={visited.has(p.id)}
                        onClick={() => {
                          setSelectedId(p.id);
                          setVisited((prev) => { const next = new Set(prev); next.add(p.id); saveVisited(next); return next; });
                          mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 16, duration: 700 });
                        }} />
                    ))
                }
              </div>
            )}
          </div>

          {/* Re-locate */}
          <div className="p-3 border-t border-border-dim">
            <button onClick={requestLocation} className="w-full btn-ghost text-sm flex items-center justify-center gap-2">
              <span className="text-teal">📍</span> Update My Location
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <Map ref={mapRef} mapStyle={MAP_STYLE}
            initialViewState={{ latitude: lat, longitude: lng, zoom: 14 }}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
            onClick={() => { setSelectedId(null); }}>
            <NavigationControl position="top-right" />

            {/* Radius circle — clearly visible search boundary */}
            <Source id="radius-fill-src" type="geojson" data={createRadiusCircle(lng, lat, radius)}>
              {/* Semi-transparent fill */}
              <Layer id="radius-fill" type="fill" paint={{
                'fill-color': '#00E5C3',
                'fill-opacity': 0.06,
              }} />
              {/* Bold outer stroke */}
              <Layer id="radius-stroke-outer" type="line" paint={{
                'fill-color': '#00E5C3',
                'line-color': '#00E5C3',
                'line-width': 4,
                'line-opacity': 0.85,
              }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
              {/* Subtle glow halo */}
              <Layer id="radius-stroke-glow" type="line" paint={{
                'line-color': '#00E5C3',
                'line-width': 12,
                'line-opacity': 0.08,
                'line-blur': 4,
              }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
            </Source>

            {/* Route line */}
            {routeGeoJSON && (
              <Source id="route" type="geojson" data={{ type: 'Feature', geometry: routeGeoJSON, properties: {} }}>
                <Layer id="route-casing" type="line" paint={{
                  'line-color': '#00E5C3',
                  'line-width': 8,
                  'line-opacity': 0.15,
                }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
                <Layer id="route-line" type="line" paint={{
                  'line-color': '#00E5C3',
                  'line-width': 4,
                  'line-opacity': 0.9,
                }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
              </Source>
            )}

            <UserMarker lat={lat} lng={lng} />

            {filtered.map((p) => (
              <PlaceMarker key={p.id} place={p} isSelected={selectedId === p.id} isVisited={visited.has(p.id)}
                onClick={() => {
                  setSelectedId(p.id);
                  setVisited((prev) => { const next = new Set(prev); next.add(p.id); saveVisited(next); return next; });
                  setRouteGeoJSON(null); setRouteInfo(null);
                  mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 16, duration: 700 });
                }} />
            ))}

            {selectedPlace && (
              <PlacePopup
                place={selectedPlace}
                isVisited={visited.has(selectedPlace.id)}
                onRoute={() => handleRoute(selectedPlace, lat, lng)}
                onClose={() => setSelectedId(null)}
              />
            )}
          </Map>

          {/* Radius label badge on map */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm border border-teal/40 rounded-full px-3 py-1.5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal/40 border border-teal" />
              <span className="font-mono text-xs text-teal font-semibold">{radius >= 1000 ? `${radius / 1000} km` : `${radius} m`} radius</span>
            </div>
          </div>

          {/* Route info card removed — now shown in sidebar */}
        </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 pointer-events-none max-w-xs">
            {ALL_TYPES.filter((t) => typeCounts[t] > 0).map((t) => (
              <div key={t} className="bg-card/90 backdrop-blur-sm border border-border-dim rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PLACE_META[t].color }} />
                <span className="font-mono text-xs text-text-muted">{PLACE_META[t].label}</span>
                <span className="font-mono text-xs text-text-faint">({typeCounts[t]})</span>
              </div>
            ))}
          </div>

          {/* Source */}
          <div className="absolute bottom-4 right-4 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm border border-border-dim rounded-lg px-2.5 py-1.5">
              <span className="font-mono text-xs text-text-faint">🌐 Live · OpenStreetMap</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
