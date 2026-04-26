import { useState, useEffect, useMemo, useRef } from 'react';
import { useDocuments } from '../api/records';
import { DocumentCard } from '../components/shared/DocumentCard';
import { CardSkeleton, EmptyState, ErrorState } from '../components/shared/Skeleton';
import { 
  ArrowLeft, ChevronRight, ChevronDown,
  HeartPulse, Activity, Wind, Brain, Apple, Bug, Bone, Droplets, Stethoscope, FileBox,
  FileJson, FileSpreadsheet, Download
} from 'lucide-react';
import type { MedDocument } from '../types/api';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'lab_report', label: 'Lab Reports' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'discharge_summary', label: 'Discharge Summaries' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'vaccination', label: 'Vaccinations' },
  { value: 'consultation', label: 'Consultations' },
];

export default function Records() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<MedDocument | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (format: 'csv' | 'json') => {
    setShowExportMenu(false);
    setExporting(true);
    try {
      const { getAuthToken } = await import('../api/base');
      const token = await getAuthToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/export?format=${format}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `MedVault_Export_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Derived Folders
  const getCategoryForCondition = (cond: string) => {
    const normalized = cond.toLowerCase().replace(/_/g, ' ');
    if (normalized.includes('stemi') || normalized.includes('hypertension') || normalized.includes('heart') || normalized.includes('cardiac') || normalized.includes('cholesterol') || normalized.includes('lipid')) return 'Cardiology';
    if (normalized.includes('diabetes') || normalized.includes('thyroid') || normalized.includes('hypothyroidism')) return 'Endocrinology';
    if (normalized.includes('asthma') || normalized.includes('copd') || normalized.includes('lung') || normalized.includes('respiratory')) return 'Pulmonology';
    if (normalized.includes('depression') || normalized.includes('psychiatry') || normalized.includes('mdd')) return 'Psychiatry';
    if (normalized.includes('fatty liver') || normalized.includes('stomach') || normalized.includes('gastric') || normalized.includes('liver')) return 'Gastroenterology';
    if (normalized.includes('infection') || normalized.includes('fever') || normalized.includes('sepsis') || normalized.includes('covid')) return 'Infectious Diseases';
    if (normalized.includes('fracture') || normalized.includes('bone') || normalized.includes('ortho')) return 'Orthopedics';
    if (normalized.includes('kidney') || normalized.includes('renal')) return 'Nephrology';
    if (normalized.includes('brain') || normalized.includes('neuro') || normalized.includes('stroke') || normalized.includes('seizure')) return 'Neurology';
    return normalized.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'Cardiology': return HeartPulse;
      case 'Endocrinology': return Activity;
      case 'Pulmonology': return Wind;
      case 'Psychiatry':
      case 'Neurology': return Brain;
      case 'Gastroenterology': return Apple;
      case 'Infectious Diseases': return Bug;
      case 'Orthopedics': return Bone;
      case 'Nephrology': return Droplets;
      case 'General Records': return FileBox;
      default: return Stethoscope;
    }
  };

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error } = useDocuments({
    search: debouncedSearch || undefined,
    type: typeFilter || undefined,
  });

  const folders = useMemo(() => {
    if (!data?.docs) return [];
    const map = new Map<string, MedDocument[]>();
    
    data.docs.forEach(doc => {
      let category = 'General Records';
      if (doc.conditionsMentioned && doc.conditionsMentioned.length > 0) {
        category = getCategoryForCondition(doc.conditionsMentioned[0]);
      }
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(doc);
    });
    
    return Array.from(map.entries()).map(([name, docs]) => ({ name, docs })).sort((a, b) => {
      if (a.name === 'General Records') return 1;
      if (b.name === 'General Records') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [data?.docs]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl text-text-primary">Document Library</h1>
          <p className="font-body text-sm text-text-muted mt-1">
            {data ? `${data.total} document${data.total !== 1 ? 's' : ''}` : 'Loading...'}
          </p>
        </div>
        {/* Export split-button */}
        <div ref={exportMenuRef} className="relative">
          <button
            onClick={() => !exporting && data?.total && setShowExportMenu((v) => !v)}
            disabled={exporting || !data?.total}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              border-2"
            style={{
              background: 'linear-gradient(135deg, var(--dd-accent), #7c3aed)',
              color: '#fff',
              borderColor: 'transparent',
              boxShadow: '0 4px 14px var(--dd-accent-dim)',
            }}
            title="Export records"
          >
            {exporting ? (
              <><span className="animate-spin inline-block">⏳</span> Exporting…</>
            ) : (
              <>
                <Download size={15} />
                Export
                <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {/* Dropdown */}
          {showExportMenu && (
            <div
              className="absolute right-0 mt-2 w-44 rounded-xl overflow-hidden z-50"
              style={{
                background: 'var(--dd-card)',
                border: '2px solid var(--dd-border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}
            >
              <button
                onClick={() => handleExport('csv')}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                  hover:bg-[var(--dd-surface)] text-[var(--dd-text)]"
              >
                <FileSpreadsheet size={16} className="text-emerald-500" />
                <span>Download CSV</span>
              </button>
              <div style={{ height: 1, background: 'var(--dd-border)' }} />
              <button
                onClick={() => handleExport('json')}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                  hover:bg-[var(--dd-surface)] text-[var(--dd-text)]"
              >
                <FileJson size={16} className="text-[var(--dd-accent)]" />
                <span>Download JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search & filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint text-sm">🔍</span>
          <input
            className="mv-input pl-9"
            placeholder="Search records, conditions, hospitals…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="mv-input w-auto min-w-36 bg-surface"
        >
          {TYPE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {selectedFolder && (
        <div className="flex items-center gap-3 my-2">
          <button 
            onClick={() => setSelectedFolder(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border-dim hover:border-teal/50 hover:bg-border-dim text-text-primary font-semibold text-sm transition-all shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Folders
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border-dim shadow-sm text-text-primary text-sm font-bold">
            {(() => {
              const Icon = getIconForCategory(selectedFolder);
              return <Icon size={16} className="text-teal" />;
            })()}
            {selectedFolder}
          </div>
        </div>
      )}

      {/* Results grid */}
      {error && <ErrorState message={error} />}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}
      {!loading && data?.docs.length === 0 && (
        <EmptyState
          message={debouncedSearch ? `No documents matching "${debouncedSearch}"` : 'No documents yet'}
          icon="📭"
        />
      )}
      
      {!loading && data && data.docs.length > 0 && !selectedFolder && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {folders.map((folder) => {
            const Icon = getIconForCategory(folder.name);
            return (
              <div 
                key={folder.name} 
                onClick={() => setSelectedFolder(folder.name)}
                className="cursor-pointer transition-all flex items-center p-5 gap-4"
                style={{ 
                  background: 'var(--dd-card)', 
                  border: '1px solid var(--dd-border)', 
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--dd-border)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div className="w-14 h-14 rounded-2xl bg-teal/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Icon size={26} className="text-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-text-primary truncate tracking-tight">{folder.name}</h3>
                  <p className="text-sm text-text-muted mt-1 font-medium">{folder.docs.length} document{folder.docs.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
                  <ChevronRight size={18} className="text-text-faint" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && data && selectedFolder && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(folders.find(f => f.name === selectedFolder)?.docs || []).map((doc) => (
            <DocumentCard key={doc._id} doc={doc} onClick={() => setSelectedDoc(doc)} />
          ))}
        </div>
      )}

      {selectedDoc && (
        <DocSlideOver doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}

function DocSlideOver({ doc, onClose }: { doc: MedDocument; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="w-full max-w-lg overflow-y-auto animate-slide-in-right p-6 flex flex-col gap-5"
        style={{
          background: 'var(--dd-card, #1e1e2e)',
          borderLeft: '1px solid var(--dd-border)',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.35)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <span className="badge-muted text-xs mb-2 inline-block capitalize">
              {doc.documentType.replace('_', ' ')}
            </span>
            <h2 className="font-sans font-bold text-xl text-text-primary truncate">{doc.filename}</h2>
            <div className="flex items-center gap-3 mt-1">
              {doc.documentDate && (
                <span className="font-mono text-xs text-text-faint">
                  {new Date(doc.documentDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </span>
              )}
              <span className={`font-mono text-xs ${doc.criticalityScore >= 7 ? 'text-coral' : doc.criticalityScore >= 4 ? 'text-amber' : 'text-teal'}`}>
                ● Criticality {doc.criticalityScore}/10
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-xl p-1 flex-shrink-0">✕</button>
        </div>

        {doc.sourceHospital && (
          <p className="font-body text-sm text-text-muted">🏥 {doc.sourceHospital}</p>
        )}
        {doc.doctorName && (
          <p className="font-body text-sm text-text-muted">👨‍⚕️ {doc.doctorName}</p>
        )}

        <div className="mv-card" style={{ background: 'var(--dd-surface)', border: '1px solid var(--dd-border)', borderRadius: 12, padding: 16 }}>
          <p className="font-sans text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--dd-text-muted)' }}>
            Clinical Summary
          </p>
          <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--dd-text)' }}>
            {doc.summaryClinical || doc.summaryPlain || 'No summary available.'}
          </p>
        </div>

        {doc.keyFindings.length > 0 && (
          <div>
            <h3 className="section-title text-sm mb-3">Key Findings</h3>
            {doc.keyFindings.map((f, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <span className="text-teal flex-shrink-0">→</span>
                <p className="font-body text-sm text-text-muted">{f}</p>
              </div>
            ))}
          </div>
        )}

        {doc.labValues.length > 0 && (
          <div>
            <h3 className="section-title text-sm mb-3">Lab Values</h3>
            <div className="overflow-x-auto rounded-lg border border-border-dim">
              <table className="w-full text-xs font-mono">
                <thead className="bg-card">
                  <tr className="text-text-faint text-left">
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2">Value</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Range</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.labValues.map((lv, i) => (
                    <tr
                      key={i}
                      className={`border-t border-border-dim ${lv.is_abnormal ? 'bg-coral/5' : ''}`}
                    >
                      <td className="px-3 py-2 text-text-muted">{lv.test_name}</td>
                      <td className={`px-3 py-2 font-semibold ${lv.is_abnormal ? 'text-coral' : 'text-text-primary'}`}>
                        {lv.value} {lv.is_abnormal && '⚠️'}
                      </td>
                      <td className="px-3 py-2 text-text-faint">{lv.unit}</td>
                      <td className="px-3 py-2 text-text-faint">{lv.reference_range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {doc.medications.length > 0 && (
          <div>
            <h3 className="section-title text-sm mb-3">Medications</h3>
            <div className="space-y-2">
              {doc.medications.map((m, i) => (
                <div key={i} className="bg-card rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-text-primary">{m.name} <span className="text-amber">{m.dosage}</span></p>
                    <p className="font-body text-xs text-text-muted">{m.frequency}</p>
                  </div>
                  <span className="font-mono text-xs text-text-faint">{m.duration}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {doc.conditionsMentioned.length > 0 && (
          <div>
            <h3 className="section-title text-sm mb-2">Conditions Mentioned</h3>
            <div className="flex flex-wrap gap-2">
              {doc.conditionsMentioned.map((c) => (
                <span key={c} className="badge-muted">{c}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
