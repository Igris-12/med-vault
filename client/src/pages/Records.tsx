import { useState, useEffect, useCallback } from 'react';
import { useDocuments } from '../api/records';
import { DocumentCard } from '../components/shared/DocumentCard';
import { CardSkeleton, EmptyState, ErrorState } from '../components/shared/Skeleton';
import { ModeToggle } from '../components/shared/ModeToggle';
import { useMode } from '../context/ModeContext';
import type { MedDocument, DocumentType } from '../types/api';

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
  const { isDoctor } = useMode();

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error } = useDocuments({
    search: debouncedSearch || undefined,
    type: typeFilter || undefined,
  });

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
        <ModeToggle />
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
      {!loading && data && data.docs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.docs.map((doc) => (
            <DocumentCard key={doc._id} doc={doc} onClick={() => setSelectedDoc(doc)} />
          ))}
        </div>
      )}

      {/* SlideOver */}
      {selectedDoc && (
        <DocSlideOver doc={selectedDoc} isDoctor={isDoctor} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}

function DocSlideOver({ doc, isDoctor, onClose }: { doc: MedDocument; isDoctor: boolean; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-surface border-l border-border-mid overflow-y-auto animate-slide-in-right p-6 flex flex-col gap-5">
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

        <div className="mv-card">
          <p className="font-sans text-xs font-semibold text-text-faint uppercase tracking-wider mb-2">
            {isDoctor ? 'Clinical Summary' : 'What This Means For You'}
          </p>
          <p className="font-body text-sm text-text-muted leading-relaxed">
            {isDoctor ? doc.summaryClinical : doc.summaryPlain}
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
