import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authFetch, getAuthToken } from '../../api/base';
import { Download } from 'lucide-react';
import {
  Folder, FolderOpen, FileText, ChevronLeft, Search,
  Heart, Wind, Pill, Activity, Stethoscope, FlaskConical, Eye, Brain,
  ScanLine, ClipboardList, AlertTriangle, ArrowRight
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PatientFolder {
  _id: string;
  name: string;
  email: string;
  photoUrl?: string;
  bloodType: string;
  totalDocs: number;
  abnormal: number;
}

interface Doc {
  _id: string;
  filename: string;
  documentType: string;
  uploadedAt: string;
  criticalityScore: number;
  summary?: string;
}

interface DocsByType {
  [type: string]: Doc[];
}

// ─── Doc type config ──────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  blood_test:         { label: 'Blood Tests',       icon: FlaskConical,   color: '#ef4444' },
  cardiac:            { label: 'Cardiac',            icon: Heart,          color: '#f43f5e' },
  ecg:                { label: 'ECG',                icon: Activity,       color: '#f43f5e' },
  imaging:            { label: 'Imaging / Radiology',icon: ScanLine,       color: '#8b5cf6' },
  prescription:       { label: 'Prescriptions',      icon: Pill,           color: '#10b981' },
  discharge_summary:  { label: 'Discharge Summary',  icon: ClipboardList,  color: '#3b82f6' },
  consultation:       { label: 'Consultations',      icon: Stethoscope,    color: '#06b6d4' },
  pulmonary:          { label: 'Pulmonary / Lungs',  icon: Wind,           color: '#6366f1' },
  neurology:          { label: 'Neurology',           icon: Brain,          color: '#a855f7' },
  ophthalmology:      { label: 'Ophthalmology',      icon: Eye,            color: '#0ea5e9' },
  other:              { label: 'Other',               icon: FileText,       color: '#64748b' },
};

function typeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG['other'];
}

function critColor(score: number) {
  if (score >= 8) return '#ef4444';
  if (score >= 5) return '#f97316';
  return '#22c55e';
}

// ─── Patient Folder Card ───────────────────────────────────────────────────────
function PatientFolderCard({ patient, onClick }: { patient: PatientFolder; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const initials = patient.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--dd-card)',
        border: `1px solid ${patient.abnormal > 3 ? 'rgba(239,68,68,0.35)' : 'var(--dd-border)'}`,
        borderRadius: 16,
        padding: '20px 18px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.18)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent for high-risk */}
      {patient.abnormal > 3 && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />
      )}

      {/* Folder icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          {hovered
            ? <FolderOpen size={36} color="var(--dd-accent)" />
            : <Folder size={36} color={patient.abnormal > 3 ? '#ef4444' : 'var(--dd-accent)'} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {patient.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--dd-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {patient.email}
          </div>
        </div>
        {/* Avatar circle */}
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--dd-accent), #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
          {patient.photoUrl ? <img src={patient.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--dd-text-muted)', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: '3px 8px', borderRadius: 99 }}>
          📄 {patient.totalDocs} docs
        </span>
        {patient.abnormal > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', padding: '3px 8px', borderRadius: 99 }}>
            ⚠ {patient.abnormal} abnormal
          </span>
        )}
        {patient.bloodType !== 'unknown' && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--dd-text-dim)', background: 'var(--dd-surface)', border: '1px solid var(--dd-border)', padding: '3px 8px', borderRadius: 99 }}>
            {patient.bloodType}
          </span>
        )}
      </div>

      {/* Arrow */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, opacity: hovered ? 1 : 0, transition: 'opacity 0.2s' }}>
        <ArrowRight size={16} color="var(--dd-accent)" />
      </div>
    </div>
  );
}

// ─── Type Folder Card ──────────────────────────────────────────────────────────
function TypeFolderCard({ type, docs, onClick, active }: { type: string; docs: Doc[]; onClick: () => void; active: boolean }) {
  const cfg = typeConfig(type);
  const Icon = cfg.icon;
  const maxCrit = docs.length ? Math.max(...docs.map(d => d.criticalityScore)) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: active ? `${cfg.color}12` : 'var(--dd-card)',
        border: `1px solid ${active ? cfg.color + '50' : 'var(--dd-border)'}`,
        borderRadius: 14,
        padding: '18px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={cfg.color} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif' }}>{cfg.label}</div>
          <div style={{ fontSize: 11, color: 'var(--dd-text-muted)' }}>{docs.length} document{docs.length !== 1 ? 's' : ''}</div>
        </div>
        {maxCrit >= 7 && <AlertTriangle size={13} color="#ef4444" style={{ marginLeft: 'auto' }} />}
      </div>

      {/* Mini bar */}
      <div style={{ height: 4, background: 'rgba(100,116,139,0.15)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (maxCrit / 10) * 100)}%`, background: cfg.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ─── Document Row ──────────────────────────────────────────────────────────────
function DocRow({ doc }: { doc: Doc }) {
  const cfg = typeConfig(doc.documentType);
  const Icon = cfg.icon;
  const date = new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
      background: 'var(--dd-card)', border: '1px solid var(--dd-border)', borderRadius: 10,
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color + '50'; e.currentTarget.style.background = cfg.color + '06'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--dd-border)'; e.currentTarget.style.background = 'var(--dd-card)'; }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={14} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
        {doc.summary && <div style={{ fontSize: 11, color: 'var(--dd-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.summary}</div>}
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <div style={{ fontSize: 10, color: 'var(--dd-text-dim)', fontFamily: 'monospace' }}>{date}</div>
        <div style={{ fontSize: 9, fontWeight: 800, color: critColor(doc.criticalityScore), background: critColor(doc.criticalityScore) + '18', border: `1px solid ${critColor(doc.criticalityScore)}30`, padding: '1px 6px', borderRadius: 99 }}>
          Score {doc.criticalityScore}
        </div>
      </div>
    </div>
  );
}

// ─── Patient Folder View ───────────────────────────────────────────────────────
function PatientFolderView({ patientId, onBack }: { patientId: string; onBack: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [patient, setPatient] = useState<PatientFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const token = await getAuthToken();
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/doctor/patients/${patientId}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${patient?.name.replace(/\s+/g, '_') ?? 'patient'}_export.${format}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    setExporting(false);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pRes, dRes] = await Promise.all([
        authFetch(`/api/doctor/patients/${patientId}`),
        authFetch(`/api/doctor/patients/${patientId}/records`),
      ]);
      const pJson = await pRes.json();
      const dJson = await dRes.json();
      if (pJson.success) setPatient(pJson.data);
      if (dJson.success) setDocs(dJson.data || []);
      setLoading(false);
    })();
  }, [patientId]);

  const byType = docs.reduce<DocsByType>((acc, d) => {
    const t = d.documentType || 'other';
    acc[t] = acc[t] ? [...acc[t], d] : [d];
    return acc;
  }, {});

  const visibleDocs = docs.filter(d => {
    const matchType = !activeType || d.documentType === activeType;
    const matchSearch = !search.trim() || d.filename.toLowerCase().includes(search.toLowerCase()) || (d.summary || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--dd-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
      Loading patient records…
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--dd-card)', border: '1px solid var(--dd-border)', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif' }}
        >
          <ChevronLeft size={14} /> All Patients
        </button>
        {patient && (
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif' }}>
              {patient.name}'s Records
            </h2>
            <div style={{ fontSize: 12, color: 'var(--dd-text-muted)', marginTop: 2 }}>
              {docs.length} documents · {Object.keys(byType).length} categories
            </div>
          </div>
        )}
        {/* Export buttons */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, border: '1px solid var(--dd-border)', background: 'var(--dd-card)', color: 'var(--dd-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, border: 'none', background: 'var(--dd-accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            <Download size={13} /> {exporting ? 'Exporting…' : 'Full Export JSON'}
          </button>
        </div>
      </div>

      {/* Type folder grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {Object.entries(byType).map(([type, typeDocs]) => (
          <TypeFolderCard
            key={type}
            type={type}
            docs={typeDocs}
            active={activeType === type}
            onClick={() => setActiveType(activeType === type ? null : type)}
          />
        ))}
      </div>

      {/* Secondary search + filter strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--dd-text-dim)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9, border: '1px solid var(--dd-border)', background: 'var(--dd-card)', color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>
        {/* Criticality filter */}
        {['All', 'Critical (8+)', 'High (5-7)', 'Normal'].map(f => (
          <button
            key={f}
            onClick={() => {}}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--dd-border)', background: 'var(--dd-card)', color: 'var(--dd-text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}
          >
            {f}
          </button>
        ))}
        {(activeType || search) && (
          <button
            onClick={() => { setActiveType(null); setSearch(''); }}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'var(--dd-accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Doc list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activeType && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {(() => { const cfg = typeConfig(activeType); const Icon = cfg.icon; return <><Icon size={14} color={cfg.color} /><span style={{ fontSize: 13, fontWeight: 700, color: cfg.color, fontFamily: 'Inter, sans-serif' }}>{cfg.label}</span></>; })()}
            <span style={{ fontSize: 11, color: 'var(--dd-text-muted)' }}>— {visibleDocs.length} files</span>
          </div>
        )}
        {visibleDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--dd-text-dim)', fontSize: 13 }}>No documents match this filter</div>
        ) : (
          visibleDocs.map(d => <DocRow key={d._id} doc={d} />)
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DoctorRecords() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId?: string }>();
  const [patients, setPatients] = useState<PatientFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await authFetch('/api/doctor/patients');
      const json = await res.json();
      if (json.success) setPatients(json.data);
      setLoading(false);
    })();
  }, []);

  const filtered = patients.filter(p =>
    !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  );

  if (patientId) {
    return (
      <PatientFolderView
        patientId={patientId}
        onBack={() => navigate('/app/doctor/records')}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Folder size={22} color="var(--dd-accent)" /> Patient Records
          </h1>
          <p style={{ fontSize: 12, color: 'var(--dd-text-dim)', margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
            Click a patient to browse their documents by category
          </p>
        </div>
        <div style={{ fontSize: 12, color: 'var(--dd-text-muted)', fontFamily: 'monospace' }}>
          {patients.length} patients
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--dd-text-dim)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search patients…"
          style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9, border: '1px solid var(--dd-border)', background: 'var(--dd-card)', color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* Patient folder grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--dd-text-dim)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map(p => (
            <PatientFolderCard
              key={p._id}
              patient={p}
              onClick={() => navigate(`/app/doctor/records/${p._id}`)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--dd-text-dim)', fontSize: 13 }}>
              No patients found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
