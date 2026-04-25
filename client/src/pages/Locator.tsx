import { useState, useCallback, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MOCK_HOSPITALS, MOCK_USER_LOCATION, ALL_SPECIALTIES,
  type Hospital, type Specialty,
} from '../mock/mockHospitals';

// ─── Config ──────────────────────────────────────────────────────────────────

// Free dark basemap — no API key required
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const SPECIALTY_ICONS: Partial<Record<Specialty, string>> = {
  Cardiology: '❤️',
  Orthopedics: '🦴',
  Neurology: '🧠',
  Endocrinology: '🔬',
  Nephrology: '💧',
  Oncology: '🎗️',
  Ophthalmology: '👁️',
  'General Medicine': '🏥',
  Pediatrics: '👶',
  Dermatology: '🧴',
};

const TYPE_BADGE: Record<Hospital['type'], string> = {
  hospital: 'badge-coral',
  clinic: 'badge-teal',
  diagnostic: 'badge-amber',
};

const TYPE_LABEL: Record<Hospital['type'], string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  diagnostic: 'Diagnostic',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="font-mono text-xs text-amber flex items-center gap-1">
      ★ {rating.toFixed(1)}
    </span>
  );
}

// ─── Map Marker ───────────────────────────────────────────────────────────────

function HospitalMarker({
  hospital,
  isSelected,
  onClick,
}: {
  hospital: Hospital;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isEmergency = hospital.emergencyAvailable;
  const baseColor = isSelected
    ? '#00E5C3'
    : isEmergency
      ? '#FF4A6E'
      : '#F5A623';

  return (
    <Marker
      latitude={hospital.lat}
      longitude={hospital.lng}
      anchor="bottom"
      onClick={(e) => { e.originalEvent.stopPropagation(); onClick(); }}
    >
      <div
        className="cursor-pointer transition-transform duration-150 hover:scale-110"
        style={{ filter: isSelected ? 'drop-shadow(0 0 8px rgba(0,229,195,0.6))' : undefined }}
      >
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 42 16 42C16 42 32 24.837 32 16C32 7.163 24.837 0 16 0Z"
            fill={baseColor}
          />
          <text
            x="16"
            y="19"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="13"
            fill="white"
            fontWeight="bold"
          >
            {hospital.type === 'hospital' ? '🏥' : hospital.type === 'clinic' ? '🩺' : '🔬'}
          </text>
        </svg>
        {isSelected && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap
                       bg-void border border-teal/40 text-teal text-xs font-mono px-2 py-0.5 rounded-full"
          >
            {hospital.name.split(' ').slice(0, 2).join(' ')}
          </div>
        )}
      </div>
    </Marker>
  );
}

// ─── User location marker ────────────────────────────────────────────────────

function UserMarker() {
  return (
    <Marker latitude={MOCK_USER_LOCATION.lat} longitude={MOCK_USER_LOCATION.lng} anchor="center">
      <div className="relative">
        <div className="w-4 h-4 rounded-full bg-teal border-2 border-white shadow-lg" />
        <div className="absolute inset-0 rounded-full bg-teal/30 animate-ping" />
      </div>
    </Marker>
  );
}

// ─── Detail Popup ─────────────────────────────────────────────────────────────

function HospitalPopup({ hospital, onClose }: { hospital: Hospital; onClose: () => void }) {
  const gmapsUrl = `https://www.google.com/maps/dir/${MOCK_USER_LOCATION.lat},${MOCK_USER_LOCATION.lng}/${hospital.lat},${hospital.lng}`;

  return (
    <Popup
      latitude={hospital.lat}
      longitude={hospital.lng}
      anchor="bottom"
      offset={48}
      onClose={onClose}
      closeButton={false}
      className="mv-popup"
      maxWidth="300px"
    >
      <div className="bg-card border border-border-mid rounded-xl shadow-card p-4 min-w-[260px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={TYPE_BADGE[hospital.type]}>{TYPE_LABEL[hospital.type]}</span>
              {hospital.emergencyAvailable && (
                <span className="badge-coral text-xs">🚨 24h Emergency</span>
              )}
            </div>
            <h3 className="font-sans font-semibold text-text-primary text-sm leading-tight">
              {hospital.name}
            </h3>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-lg leading-none">✕</button>
        </div>

        {/* Meta */}
        <div className="space-y-1.5 mb-3">
          <p className="font-body text-xs text-text-muted flex gap-2">
            <span>📍</span><span>{hospital.address}</span>
          </p>
          <p className="font-body text-xs text-text-muted flex gap-2">
            <span>📞</span>
            <a href={`tel:${hospital.phone}`} className="hover:text-teal transition-colors">
              {hospital.phone}
            </a>
          </p>
          <p className="font-body text-xs text-text-muted flex gap-2">
            <span>⏰</span><span>{hospital.timings}</span>
          </p>
          <div className="flex items-center gap-3">
            <StarRating rating={hospital.rating} />
            {hospital.bedCount && (
              <span className="font-mono text-xs text-text-faint">{hospital.bedCount} beds</span>
            )}
            <span className="font-mono text-xs text-teal">{hospital.distanceKm} km away</span>
          </div>
        </div>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {hospital.specialties.map((s) => (
            <span key={s} className="text-xs font-body text-text-faint bg-surface border border-border-dim px-2 py-0.5 rounded-full">
              {SPECIALTY_ICONS[s] || '🏥'} {s}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary flex-1 text-center text-xs py-2"
          >
            🗺️ Get Directions
          </a>
          <a
            href={`tel:${hospital.phone}`}
            className="btn-ghost px-3 text-xs py-2"
          >
            📞
          </a>
        </div>
      </div>
    </Popup>
  );
}

// ─── Hospital List Card ───────────────────────────────────────────────────────

function HospitalListCard({
  hospital,
  isSelected,
  onClick,
}: {
  hospital: Hospital;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`
        mv-card cursor-pointer transition-all duration-150 animate-fade-in
        ${isSelected ? 'border-teal/50 shadow-teal-glow bg-card-hover' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0
          ${hospital.emergencyAvailable ? 'bg-coral/15' : 'bg-surface'}`}>
          {hospital.type === 'hospital' ? '🏥' : hospital.type === 'clinic' ? '🩺' : '🔬'}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + type */}
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`${TYPE_BADGE[hospital.type]} text-xs`}>{TYPE_LABEL[hospital.type]}</span>
            {hospital.emergencyAvailable && (
              <span className="badge-coral text-xs">🚨 Emergency</span>
            )}
          </div>
          <h3 className="font-sans font-medium text-sm text-text-primary leading-snug truncate">
            {hospital.name}
          </h3>
          <p className="font-body text-xs text-text-muted truncate">{hospital.area}</p>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-1.5">
            <StarRating rating={hospital.rating} />
            <span className="font-mono text-xs text-teal">{hospital.distanceKm} km</span>
            {hospital.bedCount && (
              <span className="font-mono text-xs text-text-faint">{hospital.bedCount} beds</span>
            )}
          </div>

          {/* Top 2 specialties */}
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {hospital.specialties.slice(0, 3).map((s) => (
              <span key={s} className="text-xs text-text-faint bg-surface border border-border-dim px-1.5 py-0.5 rounded-full">
                {SPECIALTY_ICONS[s]} {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Locator() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeSpecialties, setActiveSpecialties] = useState<Set<Specialty>>(new Set());
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [activeType, setActiveType] = useState<Hospital['type'] | 'all'>('all');
  const mapRef = useRef<any>(null);

  const selectedHospital = MOCK_HOSPITALS.find((h) => h.id === selectedId) ?? null;

  const filtered = MOCK_HOSPITALS.filter((h) => {
    const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.area.toLowerCase().includes(search.toLowerCase()) ||
      h.specialties.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchEmergency = !emergencyOnly || h.emergencyAvailable;
    const matchType = activeType === 'all' || h.type === activeType;
    const matchSpecialty = activeSpecialties.size === 0 ||
      h.specialties.some((s) => activeSpecialties.has(s));
    return matchSearch && matchEmergency && matchType && matchSpecialty;
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  const toggleSpecialty = useCallback((s: Specialty) => {
    setActiveSpecialties((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }, []);

  const flyTo = useCallback((hospital: Hospital) => {
    mapRef.current?.flyTo({
      center: [hospital.lng, hospital.lat],
      zoom: 15,
      duration: 800,
    });
  }, []);

  const handleSelect = useCallback((hospital: Hospital) => {
    setSelectedId(hospital.id);
    flyTo(hospital);
  }, [flyTo]);

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border-dim bg-surface/80 backdrop-blur-sm flex-shrink-0">
        <div>
          <h1 className="font-sans font-bold text-xl text-text-primary">Hospital & Clinic Locator</h1>
          <p className="font-body text-xs text-text-muted">
            📍 {MOCK_USER_LOCATION.label} · {filtered.length} results
          </p>
        </div>

        {/* Emergency toggle */}
        <button
          onClick={() => setEmergencyOnly((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-sans font-medium transition-all duration-150 flex-shrink-0 ml-auto
            ${emergencyOnly ? 'bg-coral text-coral-text' : 'bg-surface border border-border-mid text-text-muted hover:border-coral/40 hover:text-coral'}`}
        >
          🚨 {emergencyOnly ? 'Emergency Only' : 'All Facilities'}
        </button>
      </div>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────── */}
        <div className="w-80 flex flex-col border-r border-border-dim flex-shrink-0 bg-void">
          {/* Search + type filter */}
          <div className="px-4 py-3 border-b border-border-dim space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint text-sm">🔍</span>
              <input
                className="mv-input pl-8 text-sm"
                placeholder="Search by name, area, specialty…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Type chips */}
            <div className="flex gap-2">
              {(['all', 'hospital', 'clinic', 'diagnostic'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-body transition-all capitalize
                    ${activeType === t
                      ? 'bg-teal text-teal-text font-medium'
                      : 'bg-surface border border-border-dim text-text-muted hover:border-teal/40'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Specialty filter */}
          <div className="px-4 py-3 border-b border-border-dim">
            <p className="font-body text-xs text-text-faint mb-2 uppercase tracking-wider">Specialty</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SPECIALTIES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSpecialty(s)}
                  className={`px-2 py-1 rounded-full text-xs font-body transition-all
                    ${activeSpecialties.has(s)
                      ? 'bg-amber/20 border border-amber/50 text-amber'
                      : 'bg-surface border border-border-dim text-text-faint hover:border-amber/30'
                    }`}
                >
                  {SPECIALTY_ICONS[s]} {s}
                </button>
              ))}
              {activeSpecialties.size > 0 && (
                <button
                  onClick={() => setActiveSpecialties(new Set())}
                  className="text-xs text-text-faint hover:text-coral transition-colors px-2 py-1"
                >
                  Clear ✕
                </button>
              )}
            </div>
          </div>

          {/* Hospital list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <span className="text-3xl block mb-2">🏥</span>
                <p className="font-body text-sm text-text-muted">No facilities match your filters</p>
              </div>
            )}
            {filtered.map((h) => (
              <HospitalListCard
                key={h.id}
                hospital={h}
                isSelected={selectedId === h.id}
                onClick={() => handleSelect(h)}
              />
            ))}
          </div>
        </div>

        {/* ── Map ──────────────────────────────────────────── */}
        <div className="flex-1 relative">
          <Map
            ref={mapRef}
            mapStyle={MAP_STYLE}
            initialViewState={{
              latitude: MOCK_USER_LOCATION.lat,
              longitude: MOCK_USER_LOCATION.lng,
              zoom: 13,
            }}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
          >
            <NavigationControl position="top-right" />
            <GeolocateControl position="top-right" />

            {/* User location */}
            <UserMarker />

            {/* Hospital markers — show all, highlight filtered */}
            {MOCK_HOSPITALS.map((h) => {
              const isFiltered = filtered.some((f) => f.id === h.id);
              return (
                <HospitalMarker
                  key={h.id}
                  hospital={h}
                  isSelected={selectedId === h.id}
                  onClick={() => isFiltered ? handleSelect(h) : undefined}
                />
              );
            })}

            {/* Selected popup */}
            {selectedHospital && (
              <HospitalPopup
                hospital={selectedHospital}
                onClose={() => setSelectedId(null)}
              />
            )}
          </Map>

          {/* Stats overlay */}
          <div className="absolute bottom-4 left-4 flex gap-2 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm border border-border-dim rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-coral flex-shrink-0" />
              <span className="font-mono text-xs text-text-muted">Emergency</span>
            </div>
            <div className="bg-card/90 backdrop-blur-sm border border-border-dim rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber flex-shrink-0" />
              <span className="font-mono text-xs text-text-muted">Clinic / Lab</span>
            </div>
            <div className="bg-card/90 backdrop-blur-sm border border-border-dim rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal flex-shrink-0 animate-pulse" />
              <span className="font-mono text-xs text-text-muted">Your location</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
