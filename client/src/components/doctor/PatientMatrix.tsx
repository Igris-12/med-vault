import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpDown, TrendingUp } from 'lucide-react';

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

type SortKey = 'name' | 'totalDocs' | 'abnormal' | 'activeRx' | 'risk';

interface Props {
  patients: PatientSummary[];
  onSelect: (id: string) => void;
}

function RiskBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max === 0 ? 0 : Math.round((value / max) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(100,116,139,0.15)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'monospace', minWidth: 20 }}>{value}</span>
    </div>
  );
}

function riskScore(p: PatientSummary) {
  return p.abnormal * 3 + (p.totalDocs > 0 ? 0 : 2);
}

function riskLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 9) return { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  if (score >= 5) return { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  if (score >= 2) return { label: 'Moderate', color: '#eab308', bg: 'rgba(234,179,8,0.12)' };
  return { label: 'Low', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
}

function getAge(dob?: string) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / 3.156e10);
}

const BLOOD_COLORS: Record<string, string> = {
  'A+': '#ef4444', 'A-': '#f87171', 'B+': '#3b82f6', 'B-': '#60a5fa',
  'AB+': '#8b5cf6', 'AB-': '#a78bfa', 'O+': '#10b981', 'O-': '#34d399',
};

export function PatientMatrix({ patients, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterRisk, setFilterRisk] = useState<'all' | 'critical' | 'high' | 'moderate' | 'low'>('all');

  const maxDocs = Math.max(...patients.map(p => p.totalDocs), 1);
  const maxAbnormal = Math.max(...patients.map(p => p.abnormal), 1);
  const maxRx = Math.max(...patients.map(p => p.activeRx), 1);

  const sorted = useMemo(() => {
    let list = [...patients];

    if (filterRisk !== 'all') {
      list = list.filter(p => riskLabel(riskScore(p)).label.toLowerCase() === filterRisk);
    }

    list.sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortKey === 'totalDocs') { av = a.totalDocs; bv = b.totalDocs; }
      if (sortKey === 'abnormal') { av = a.abnormal; bv = b.abnormal; }
      if (sortKey === 'activeRx') { av = a.activeRx; bv = b.activeRx; }
      if (sortKey === 'risk') { av = riskScore(a); bv = riskScore(b); }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [patients, sortKey, sortDir, filterRisk]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const critCount = patients.filter(p => riskScore(p) >= 9).length;
  const highCount = patients.filter(p => { const s = riskScore(p); return s >= 5 && s < 9; }).length;

  const col = (label: string, key: SortKey, width?: number) => (
    <th
      onClick={() => toggleSort(key)}
      style={{
        padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--dd-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left',
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        background: sortKey === key ? 'rgba(var(--dd-accent-rgb,99,102,241),0.08)' : 'transparent',
        width: width || 'auto',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {label}
        <ArrowUpDown size={9} style={{ opacity: sortKey === key ? 1 : 0.3 }} />
      </span>
    </th>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary insight strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total', value: patients.length, color: 'var(--dd-accent)', bg: 'rgba(99,102,241,0.08)' },
          { label: 'Critical', value: critCount, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
          { label: 'High Risk', value: highCount, color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
          { label: 'Avg. Docs', value: patients.length ? Math.round(patients.reduce((s, p) => s + p.totalDocs, 0) / patients.length) : 0, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}25`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--dd-text-muted)', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Risk distribution bar */}
      <div style={{ background: 'var(--dd-card)', border: '1px solid var(--dd-border)', borderRadius: 12, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TrendingUp size={14} color="var(--dd-accent)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif' }}>Population Risk Distribution</span>
        </div>
        <div style={{ display: 'flex', height: 20, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
          {(['Critical', 'High', 'Moderate', 'Low'] as const).map(level => {
            const colors: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Moderate: '#eab308', Low: '#22c55e' };
            const count = patients.filter(p => riskLabel(riskScore(p)).label === level).length;
            const pct = patients.length ? (count / patients.length) * 100 : 0;
            if (!count) return null;
            return (
              <div
                key={level}
                title={`${level}: ${count} patients (${Math.round(pct)}%)`}
                style={{ width: `${pct}%`, background: colors[level], display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s ease', minWidth: count > 0 ? 28 : 0 }}
              >
                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>{count}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          {[['#ef4444', 'Critical'], ['#f97316', 'High'], ['#eab308', 'Moderate'], ['#22c55e', 'Low']].map(([color, label]) => (
            <span
              key={label}
              onClick={() => setFilterRisk(filterRisk === label.toLowerCase() ? 'all' : label.toLowerCase() as typeof filterRisk)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, color: 'var(--dd-text-muted)', fontWeight: filterRisk === label.toLowerCase() ? 700 : 400 }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {label}
            </span>
          ))}
          {filterRisk !== 'all' && (
            <span onClick={() => setFilterRisk('all')} style={{ fontSize: 11, color: 'var(--dd-accent)', cursor: 'pointer', marginLeft: 'auto', fontWeight: 600 }}>
              Clear filter ×
            </span>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ background: 'var(--dd-card)', border: '1px solid var(--dd-border)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--dd-border)' }}>
              {col('Patient', 'name', 200)}
              <th style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--dd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Blood</th>
              <th style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--dd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'left' }}>Age</th>
              {col('Records', 'totalDocs', 140)}
              {col('Abnormal', 'abnormal', 140)}
              {col('Active Rx', 'activeRx', 140)}
              {col('Risk', 'risk', 120)}
              <th style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--dd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Last Visit</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const risk = riskLabel(riskScore(p));
              const age = getAge(p.dateOfBirth);
              const bloodColor = BLOOD_COLORS[p.bloodType] || 'var(--dd-text-muted)';
              return (
                <tr
                  key={p._id}
                  onClick={() => onSelect(p._id)}
                  style={{
                    borderBottom: '1px solid var(--dd-border)',
                    cursor: 'pointer',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(100,116,139,0.03)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(100,116,139,0.03)')}
                >
                  {/* Patient */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, var(--dd-accent), #7c3aed)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 12, overflow: 'hidden',
                      }}>
                        {p.photoUrl ? <img src={p.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--dd-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{p.email}</div>
                      </div>
                      {p.abnormal > 3 && <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />}
                    </div>
                  </td>

                  {/* Blood */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: bloodColor,
                      background: `${bloodColor}18`, border: `1px solid ${bloodColor}30`,
                      padding: '2px 7px', borderRadius: 99, fontFamily: 'monospace',
                    }}>
                      {p.bloodType !== 'unknown' ? p.bloodType : '—'}
                    </span>
                  </td>

                  {/* Age */}
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--dd-text-muted)', fontFamily: 'monospace' }}>
                    {age ? `${age}y` : '—'}
                  </td>

                  {/* Records bar */}
                  <td style={{ padding: '12px 14px', minWidth: 120 }}>
                    <RiskBar value={p.totalDocs} max={maxDocs} color="#6366f1" />
                  </td>

                  {/* Abnormal bar */}
                  <td style={{ padding: '12px 14px', minWidth: 120 }}>
                    <RiskBar value={p.abnormal} max={maxAbnormal} color={p.abnormal > 3 ? '#ef4444' : p.abnormal > 1 ? '#f97316' : '#22c55e'} />
                  </td>

                  {/* Active Rx bar */}
                  <td style={{ padding: '12px 14px', minWidth: 120 }}>
                    <RiskBar value={p.activeRx} max={maxRx} color="#8b5cf6" />
                  </td>

                  {/* Risk badge */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: risk.color,
                      background: risk.bg, border: `1px solid ${risk.color}30`,
                      padding: '3px 8px', borderRadius: 99, whiteSpace: 'nowrap',
                    }}>
                      {risk.label}
                    </span>
                  </td>

                  {/* Last visit */}
                  <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--dd-text-dim)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--dd-text-dim)', fontSize: 13 }}>
                  No patients match this filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
