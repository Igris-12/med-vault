import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, FileText, AlertTriangle, Activity, Brain, Sparkles,
  TrendingUp, Clock, ChevronRight, Loader2, X, Send, User, Pill, TestTube,
  Calendar, Building2, Zap, Shield, Eye } from 'lucide-react';
import { authFetch } from '../../api/base';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PatientSummary {
  _id: string;
  name: string;
  email: string;
  photoUrl?: string;
  bloodType: string;
  dateOfBirth?: string;
  totalDocs: number;
  abnormal: number;
  activeRx: number;
  lastVisit?: string;
  lastDocType?: string;
}
interface DoctorStats {
  totalPatients: number;
  totalDocs: number;
  abnormalDocs: number;
  recentUploads: Array<{ _id: string; userId: string; filename: string; uploadedAt: string; documentType: string; criticalityScore: number; patientName: string }>;
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, pulse }: { icon: any; label: string; value: string | number; sub?: string; color: string; pulse?: boolean }) {
  return (
    <div style={{
      background: 'var(--dd-card)', border: '1px solid var(--dd-border)', borderRadius: 16,
      padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: `${color}08`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        {pulse && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: 'pulse 2s infinite' }} />}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--dd-text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Patient Card ───────────────────────────────────────────────────────────────
function PatientCard({ patient, onClick }: { patient: PatientSummary; onClick: () => void }) {
  const age = patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 3.156e10) : null;
  const criticalRisk = patient.abnormal > 3;
  const lastVisitLabel = patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--dd-card)', border: `1px solid ${criticalRisk ? 'rgba(239,68,68,0.3)' : 'var(--dd-border)'}`,
        borderRadius: 14, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.18s',
        display: 'flex', gap: 14, alignItems: 'center', position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {criticalRisk && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />}

      {/* Avatar */}
      <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: `linear-gradient(135deg, var(--dd-accent), #7c3aed)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: 'Inter, sans-serif' }}>
        {patient.photoUrl ? <img src={patient.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : patient.name[0]?.toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif' }}>{patient.name}</span>
          {criticalRisk && <span style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '1px 6px', borderRadius: 99 }}>⚠ HIGH RISK</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--dd-text-muted)', fontFamily: 'Inter, sans-serif' }}>
          {age ? `${age}y` : ''}{patient.bloodType !== 'unknown' ? ` · ${patient.bloodType}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Chip icon="📄" label={`${patient.totalDocs} docs`} />
          <Chip icon="💊" label={`${patient.activeRx} Rx`} />
          {patient.abnormal > 0 && <Chip icon="⚠" label={`${patient.abnormal} abnormal`} color="#ef4444" />}
        </div>
      </div>

      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 10, color: 'var(--dd-text-dim)', fontFamily: 'monospace' }}>Last visit</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dd-text-muted)' }}>{lastVisitLabel}</div>
        <ChevronRight size={14} color="var(--dd-text-dim)" style={{ marginTop: 8 }} />
      </div>
    </div>
  );
}

function Chip({ icon, label, color }: { icon: string; label: string; color?: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: color || 'var(--dd-text-muted)', background: color ? `${color}15` : 'var(--dd-surface)', border: `1px solid ${color ? color + '30' : 'var(--dd-border)'}`, padding: '2px 7px', borderRadius: 99, fontFamily: 'Inter, sans-serif' }}>
      {icon} {label}
    </span>
  );
}

// ─── Recent Activity Feed ───────────────────────────────────────────────────────
function RecentActivity({ items }: { items: DoctorStats['recentUploads'] }) {
  const typeIcon: Record<string, string> = { blood_test: '🩸', prescription: '💊', imaging: '📷', ecg: '❤️', discharge_summary: '🏥', consultation: '👨‍⚕️' };
  return (
    <div style={{ background: 'var(--dd-card)', border: '1px solid var(--dd-border)', borderRadius: 16, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Clock size={15} color="var(--dd-accent)" />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif' }}>Recent Uploads</span>
      </div>
      {items.map(item => (
        <div key={item._id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--dd-border)' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{typeIcon[item.documentType] || '📋'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.filename}</div>
            <div style={{ fontSize: 11, color: 'var(--dd-text-muted)' }}>{item.patientName}</div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--dd-text-dim)', fontFamily: 'monospace' }}>{new Date(item.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
            <div style={{ fontSize: 9, marginTop: 2, padding: '1px 5px', borderRadius: 6, background: item.criticalityScore >= 7 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: item.criticalityScore >= 7 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
              Score {item.criticalityScore}
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--dd-text-dim)', fontSize: 12 }}>No recent uploads</div>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sRes, pRes] = await Promise.all([
          authFetch('/api/doctor/stats'),
          authFetch('/api/doctor/patients'),
        ]);
        const sJson = await sRes.json();
        const pJson = await pRes.json();
        if (sJson.success) setStats(sJson.data);
        if (pJson.success) setPatients(pJson.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      authFetch('/api/doctor/patients').then(r => r.json()).then(d => { if (d.success) setPatients(d.data); });
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const r = await authFetch(`/api/doctor/patients?search=${encodeURIComponent(q)}`);
      const d = await r.json();
      if (d.success) setPatients(d.data);
      setSearching(false);
    }, 400);
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <Loader2 size={32} color="var(--dd-accent)" style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'var(--dd-text-muted)', fontFamily: 'Inter, sans-serif' }}>Loading patient data...</p>
    </div>
  );

  const highRisk = patients.filter(p => p.abnormal > 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            Doctor Portal <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--dd-text-muted)' }}>— AI-Powered Clinical Intelligence</span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--dd-text-dim)', margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
            Real-time patient records, AI summaries, and natural language search
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/app/doctor/patients')} style={{ padding: '8px 16px', borderRadius: 10, background: 'var(--dd-accent)', border: 'none', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} /> All Patients
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard icon={Users} label="Total Patients" value={stats?.totalPatients ?? 0} sub="in the system" color="var(--dd-accent)" />
        <StatCard icon={FileText} label="Processed Records" value={stats?.totalDocs ?? 0} sub="AI-extracted" color="#22c55e" />
        <StatCard icon={AlertTriangle} label="Abnormal Results" value={stats?.abnormalDocs ?? 0} sub="needs review" color="#ef4444" pulse />
        <StatCard icon={Shield} label="High-Risk Patients" value={highRisk.length} sub="3+ abnormal flags" color="#f97316" />
      </div>

      {/* High-risk alert banner */}
      {highRisk.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} color="#ef4444" />
          <div>
            <span style={{ fontWeight: 700, color: '#ef4444', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
              {highRisk.length} patient{highRisk.length > 1 ? 's' : ''} flagged for high-risk lab values:
            </span>
            <span style={{ fontSize: 12, color: '#f87171', marginLeft: 8 }}>{highRisk.slice(0, 3).map(p => p.name).join(', ')}{highRisk.length > 3 ? ` +${highRisk.length - 3} more` : ''}</span>
          </div>
        </div>
      )}

      {/* Main grid: patients + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Patient list column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--dd-text-dim)' }} />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search patients by name or email..."
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid var(--dd-border)', background: 'var(--dd-card)', color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
            />
            {searching && <Loader2 size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--dd-accent)', animation: 'spin 1s linear infinite' }} />}
          </div>

          <div style={{ fontSize: 11, color: 'var(--dd-text-dim)', fontFamily: 'monospace' }}>{patients.length} patient{patients.length !== 1 ? 's' : ''} {search ? 'matching' : 'total'}</div>

          {patients.map(p => (
            <PatientCard key={p._id} patient={p} onClick={() => navigate(`/app/doctor/patients/${p._id}`)} />
          ))}
          {patients.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--dd-text-dim)' }}>
              <User size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13 }}>No patients found</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RecentActivity items={stats?.recentUploads ?? []} />

          {/* Quick actions */}
          <div style={{ background: 'var(--dd-card)', border: '1px solid var(--dd-border)', borderRadius: 16, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={14} color="var(--dd-accent)" /> Quick Actions
            </div>
            {[
              { icon: Brain, label: 'AI Patient Search', desc: 'Natural language', action: () => navigate('/app/doctor/patients') },
              { icon: TrendingUp, label: 'Lab Trend Analysis', desc: 'See lab value history', action: () => navigate('/app/doctor/patients') },
              { icon: Activity, label: 'Symptom Graph', desc: 'Clinical knowledge graph', action: () => navigate('/app/symptom-graph') },
            ].map(({ icon: Icon, label, desc, action }) => (
              <div key={label} onClick={action} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid var(--dd-border)' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--dd-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color="var(--dd-accent)" />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif' }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'var(--dd-text-muted)' }}>{desc}</div>
                </div>
                <ChevronRight size={12} color="var(--dd-text-dim)" style={{ marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
