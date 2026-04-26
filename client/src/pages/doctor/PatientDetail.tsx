import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Send, Loader2, AlertTriangle, Pill,
  TestTube, Calendar, Building2, TrendingUp, Sparkles, X, ChevronDown } from 'lucide-react';
import { authFetch } from '../../api/base';

const TYPE_ICON: Record<string, string> = { blood_test:'🩸', prescription:'💊', imaging:'📷', ecg:'❤️', discharge_summary:'🏥', consultation:'👨‍⚕️', other:'📋' };
const SCORE_COLOR = (s: number) => s >= 8 ? '#ef4444' : s >= 5 ? '#f97316' : '#22c55e';

interface LabValue { test_name: string; value: string; unit: string; reference_range: string; is_abnormal: boolean; documentDate?: string }
interface TimelineItem { id: string; date: string; type: string; title: string; hospital?: string; doctor?: string; conditions: string[]; criticalityScore: number; summaryPlain: string; summaryClinical: string; labValues: LabValue[]; keyFindings: string[]; tags: string[] }
interface Rx { _id: string; drugName: string; dosage: string; frequency: string; status: string; prescribingDoctor?: string }
interface PatientData {
  patient: { _id: string; name: string; email: string; bloodType: string; dateOfBirth?: string; allergies: string[] };
  timeline: TimelineItem[];
  rxs: Rx[];
  abnormalLabs: LabValue[];
  conditions: Array<{ name: string; count: number }>;
  allLabValues?: LabValue[];
}

// ── mini components ──────────────────────────────────────────────────────────
function Badge({ children, color = 'var(--dd-accent)' }: { children: React.ReactNode; color?: string }) {
  return <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, padding: '2px 7px', borderRadius: 99, fontFamily: 'Inter,sans-serif' }}>{children}</span>;
}

function LabBadge({ lv }: { lv: LabValue }) {
  const c = lv.is_abnormal ? '#ef4444' : '#22c55e';
  return (
    <div style={{ padding: '8px 12px', borderRadius: 10, background: `${c}0d`, border: `1px solid ${c}30` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dd-text)', fontFamily: 'Inter,sans-serif' }}>{lv.test_name}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: c, fontFamily: 'monospace' }}>{lv.value} <span style={{ fontSize: 10, fontWeight: 400 }}>{lv.unit}</span></div>
      <div style={{ fontSize: 10, color: 'var(--dd-text-dim)' }}>Ref: {lv.reference_range}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children, accent = 'var(--dd-accent)' }: { title: string; icon: any; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: 'var(--dd-card)', border: '1px solid var(--dd-border)', borderRadius: 16, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Icon size={15} color={accent} />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--dd-text)', fontFamily: 'Inter,sans-serif' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── AI NL Search Panel ────────────────────────────────────────────────────────
function NLSearchPanel({ patientId }: { patientId: string }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const SUGGESTIONS = [
    'Show all blood reports from last year',
    'What are the abnormal lab values?',
    'List all prescriptions and dosages',
    'Summarize recent hospital visits',
    'Any signs of diabetes or hypertension?',
  ];

  const search = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true); setResult('');
    try {
      const r = await authFetch(`/api/doctor/patients/${patientId}/nl-search`, { method: 'POST', body: JSON.stringify({ query: q }) });
      const d = await r.json();
      if (d.success) setResult(d.data.answer);
    } catch { setResult('Search failed. Please try again.'); }
    setLoading(false);
  };

  return (
    <Section title="AI Natural Language Search" icon={Brain} accent="#7c3aed">
      <p style={{ fontSize: 12, color: 'var(--dd-text-muted)', marginBottom: 12, fontFamily: 'Inter,sans-serif' }}>
        Ask anything about this patient's records — powered by Gemini AI
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => { setQuery(s); search(s); }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, border: '1px solid var(--dd-border)', background: 'var(--dd-surface)', color: 'var(--dd-text-muted)', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
            {s}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(query)}
          placeholder='e.g. "Show all blood reports from last year"'
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--dd-border)', background: 'var(--dd-surface)', color: 'var(--dd-text)', fontFamily: 'Inter,sans-serif', fontSize: 13, outline: 'none' }}
        />
        <button onClick={() => search(query)} disabled={loading || !query.trim()} style={{ padding: '10px 16px', borderRadius: 10, background: '#7c3aed', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
        </button>
      </div>
      {result && (
        <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, color: 'var(--dd-text)', fontFamily: 'Inter,sans-serif' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles size={10} /> AI RESPONSE</div>
          {result}
        </div>
      )}
    </Section>
  );
}

// ── AI Summary Panel ──────────────────────────────────────────────────────────
function AISummaryPanel({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');

  const generate = async () => {
    setLoading(true); setSummary('');
    try {
      const r = await authFetch(`/api/doctor/patients/${patientId}/ai-summary`, { method: 'POST' });
      const d = await r.json();
      if (d.success) { setSummary(d.data.summary); setGeneratedAt(new Date(d.data.generatedAt).toLocaleTimeString()); }
    } catch { setSummary('Failed to generate. Check AI server status.'); }
    setLoading(false);
  };

  return (
    <Section title="AI Clinical Summary" icon={Sparkles} accent="#14b8a6">
      <p style={{ fontSize: 12, color: 'var(--dd-text-muted)', marginBottom: 14, fontFamily: 'Inter,sans-serif' }}>
        Generates a structured handover summary based on all patient records
      </p>
      {!summary && (
        <button onClick={generate} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg, #14b8a6, #7c3aed)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating with Gemini AI...</> : <><Sparkles size={16} /> Generate AI Clinical Summary</>}
        </button>
      )}
      {summary && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <Badge color="#14b8a6">Generated at {generatedAt}</Badge>
            <button onClick={() => setSummary('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dd-text-dim)' }}><X size={13} /></button>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.75, color: 'var(--dd-text)', fontFamily: 'Inter,sans-serif', padding: '14px 16px', background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: 12 }}>
            {summary}
          </div>
          <button onClick={generate} disabled={loading} style={{ marginTop: 10, padding: '6px 14px', borderRadius: 8, background: 'var(--dd-surface)', border: '1px solid var(--dd-border)', color: 'var(--dd-text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
            Regenerate
          </button>
        </div>
      )}
    </Section>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function Timeline({ items }: { items: TimelineItem[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <Section title="Medical Timeline" icon={Calendar} accent="#f59e0b">
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        <div style={{ position: 'absolute', left: 6, top: 0, bottom: 0, width: 2, background: 'var(--dd-border)' }} />
        {items.map(item => (
          <div key={item.id} style={{ position: 'relative', marginBottom: 16 }}>
            <div style={{ position: 'absolute', left: -21, top: 14, width: 10, height: 10, borderRadius: '50%', background: SCORE_COLOR(item.criticalityScore), border: '2px solid var(--dd-card)', boxShadow: `0 0 0 3px ${SCORE_COLOR(item.criticalityScore)}30` }} />
            <div style={{ background: 'var(--dd-surface)', border: `1px solid var(--dd-border)`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}
              onClick={() => setExpanded(e => e === item.id ? null : item.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{TYPE_ICON[item.type] || '📋'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--dd-text)', fontFamily: 'Inter,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--dd-text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                    {item.hospital && <><Building2 size={10} /> {item.hospital}</>}
                    {item.date && <><Calendar size={10} /> {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Badge color={SCORE_COLOR(item.criticalityScore)}>Score {item.criticalityScore}</Badge>
                  <ChevronDown size={13} color="var(--dd-text-dim)" style={{ transform: expanded === item.id ? 'rotate(180deg)' : '', transition: '0.2s' }} />
                </div>
              </div>
              {expanded === item.id && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--dd-border)', paddingTop: 12 }}>
                  {item.summaryPlain && <p style={{ fontSize: 12, color: 'var(--dd-text-muted)', lineHeight: 1.6, marginBottom: 10, fontFamily: 'Inter,sans-serif' }}>{item.summaryPlain}</p>}
                  {item.conditions.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>{item.conditions.map(c => <Badge key={c} color="#7c3aed">{c}</Badge>)}</div>}
                  {item.labValues.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
                      {item.labValues.map((lv, i) => <LabBadge key={i} lv={lv} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--dd-text-dim)', fontSize: 12 }}>No records yet</div>}
      </div>
    </Section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await authFetch(`/api/doctor/patients/${id}`);
        const d = await r.json();
        if (d.success) setData(d.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, flexDirection: 'column' }}>
      <Loader2 size={32} color="var(--dd-accent)" style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'var(--dd-text-muted)', fontFamily: 'Inter,sans-serif' }}>Loading patient profile...</p>
    </div>
  );
  if (!data) return <div style={{ textAlign: 'center', padding: 48, color: 'var(--dd-text-dim)' }}>Patient not found</div>;

  const { patient, timeline, rxs, abnormalLabs, conditions } = data;
  const age = patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 3.156e10) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => navigate('/app/doctor/dashboard')} style={{ padding: '8px', borderRadius: 10, background: 'var(--dd-surface)', border: '1px solid var(--dd-border)', cursor: 'pointer', color: 'var(--dd-text-muted)', display: 'flex' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,var(--dd-accent),#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'Inter,sans-serif' }}>
          {patient.name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--dd-text)', fontFamily: 'Inter,sans-serif', margin: 0 }}>{patient.name}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {age && <Badge>{age} years</Badge>}
            {patient.bloodType !== 'unknown' && <Badge color="#ef4444">{patient.bloodType}</Badge>}
            {patient.allergies?.length > 0 && <Badge color="#f97316">⚠ {patient.allergies.join(', ')}</Badge>}
            <Badge color="#22c55e">{timeline.length} records</Badge>
            <Badge color="#7c3aed">{rxs.filter(r => r.status === 'active').length} active Rx</Badge>
          </div>
        </div>
      </div>

      {/* Abnormal labs alert */}
      {abnormalLabs.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={15} color="#ef4444" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#ef4444', fontFamily: 'Inter,sans-serif' }}>{abnormalLabs.length} Abnormal Lab Value{abnormalLabs.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
            {abnormalLabs.slice(0, 8).map((lv, i) => <LabBadge key={i} lv={lv} />)}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <NLSearchPanel patientId={id!} />
          <AISummaryPanel patientId={id!} />
          <Timeline items={timeline} />
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Active medications */}
          <Section title="Active Medications" icon={Pill} accent="#22c55e">
            {rxs.filter(r => r.status === 'active').map(rx => (
              <div key={rx._id} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--dd-surface)', border: '1px solid var(--dd-border)', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--dd-text)', fontFamily: 'Inter,sans-serif' }}>{rx.drugName}</div>
                <div style={{ fontSize: 11, color: 'var(--dd-text-muted)' }}>{rx.dosage} · {rx.frequency}</div>
                {rx.prescribingDoctor && <div style={{ fontSize: 10, color: 'var(--dd-text-dim)', marginTop: 2 }}>Dr. {rx.prescribingDoctor}</div>}
              </div>
            ))}
            {rxs.filter(r => r.status === 'active').length === 0 && <p style={{ fontSize: 12, color: 'var(--dd-text-dim)', fontFamily: 'Inter,sans-serif' }}>No active medications</p>}
          </Section>

          {/* Conditions frequency */}
          <Section title="Recurring Conditions" icon={TrendingUp} accent="#f59e0b">
            {conditions.slice(0, 10).map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--dd-border)', marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: 'var(--dd-accent)', width: `${Math.min(100, (c.count / (conditions[0]?.count || 1)) * 100)}%`, transition: 'width 0.5s' }} />
                  </div>
                </div>
                <Badge>{c.count}x</Badge>
              </div>
            ))}
            {conditions.length === 0 && <p style={{ fontSize: 12, color: 'var(--dd-text-dim)', fontFamily: 'Inter,sans-serif' }}>No conditions extracted</p>}
          </Section>

          {/* Lab summary */}
          <Section title="All Lab Values" icon={TestTube} accent="#8b5cf6">
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.allLabValues?.slice(0, 20).map((lv, i) => <LabBadge key={i} lv={lv} />)}
              {(!data.allLabValues || data.allLabValues.length === 0) && <p style={{ fontSize: 12, color: 'var(--dd-text-dim)', fontFamily: 'Inter,sans-serif' }}>No lab values</p>}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
