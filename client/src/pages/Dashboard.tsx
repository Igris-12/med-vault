import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardSummary, useAnomalies, useDocuments, useTimeline } from '../api/records';
import { HealthPulseRiver } from '../components/viz/HealthPulseRiver';
import { DocumentCard } from '../components/shared/DocumentCard';
import { ModeToggle } from '../components/shared/ModeToggle';
import { CardSkeleton, EmptyState, ErrorState } from '../components/shared/Skeleton';
import { useMode } from '../context/ModeContext';
import type { MedDocument, Anomaly, TimelineMonth } from '../types/api';
import { MOCK_USER } from '../mock';

function StatCard({ icon, value, label, color = 'text-teal' }: {
  icon: string; value: string | number; label: string; color?: string;
}) {
  return (
    <div className="stat-card animate-slide-in-up">
      <span className="text-2xl">{icon}</span>
      <p className={`font-mono font-bold text-2xl ${color}`}>{value}</p>
      <p className="font-body text-xs text-text-muted">{label}</p>
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const { isDoctor } = useMode();
  const latest = anomaly.readings[anomaly.readings.length - 1];
  const first = anomaly.readings[0];
  const delta = latest.value - first.value;

  return (
    <div className={`mv-card border-l-2 animate-slide-in-up
      ${anomaly.severity === 'severe' ? 'border-l-coral glow-coral' : ''}
      ${anomaly.severity === 'moderate' ? 'border-l-amber' : ''}
      ${anomaly.severity === 'mild' ? 'border-l-teal' : ''}
    `}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-sans font-semibold text-text-primary">{anomaly.testName}</p>
          <p className="font-mono text-xs text-text-faint mt-0.5">
            {anomaly.readings.length} readings · {anomaly.direction}
          </p>
        </div>
        <span className={`badge capitalize
          ${anomaly.severity === 'moderate' ? 'badge-amber' : ''}
          ${anomaly.severity === 'mild' ? 'badge-teal' : ''}
          ${anomaly.severity === 'severe' ? 'badge-coral' : ''}
        `}>{anomaly.severity}</span>
      </div>

      {/* Mini sparkline */}
      <div className="flex items-end gap-1 h-8 mb-3">
        {anomaly.readings.map((r, i) => {
          const max = Math.max(...anomaly.readings.map((x) => x.value));
          const h = Math.max(8, (r.value / max) * 32);
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-all ${i === anomaly.readings.length - 1 ? 'bg-coral' : 'bg-surface'}`}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>

      <p className="font-body text-xs text-text-muted leading-relaxed">
        {isDoctor ? anomaly.clinicalExplanation : anomaly.plainExplanation}
      </p>

      <p className="font-mono text-xs mt-2">
        <span className="text-text-faint">Latest: </span>
        <span className="text-text-primary">{latest.value} {latest.unit}</span>
        <span className={`ml-2 ${delta > 0 ? 'text-coral' : 'text-teal'}`}>
          {delta > 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(1)}
        </span>
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [hoveredMonth, setHoveredMonth] = useState<TimelineMonth | null>(null);
  const { data: summary, loading: sLoading } = useDashboardSummary();
  const { data: anomalies, loading: aLoading } = useAnomalies();
  const { data: docsResult, loading: dLoading } = useDocuments({ limit: 3 });
  const { data: timeline } = useTimeline();
  const [selectedDoc, setSelectedDoc] = useState<MedDocument | null>(null);

  const stats = summary ? [
    { icon: '📄', value: summary.totalDocuments, label: 'Total Documents', color: 'text-teal' },
    { icon: '💊', value: summary.activePrescriptionCount, label: 'Active Medications', color: 'text-amber' },
    { icon: '⚠️', value: summary.anomalyCount, label: 'Anomalies Detected', color: 'text-coral' },
    { icon: '📅', value: `${summary.daysTracked}d`, label: 'Days Tracked', color: 'text-text-primary' },
  ] : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans font-bold text-2xl text-text-primary">
            Good morning, {MOCK_USER.name.split(' ')[0]} 👋
          </h1>
          <p className="font-body text-sm text-text-muted mt-1">
            {hoveredMonth ? `Viewing ${hoveredMonth.month}` : 'Your health command center'}
          </p>
        </div>
        <ModeToggle />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sLoading
          ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
          : stats.map((s) => <StatCard key={s.label} {...s} />)
        }
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Health Pulse River — spans 2 cols */}
        <div className="xl:col-span-2 mv-card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Health Pulse</h2>
            <Link to="/app/timeline" className="text-xs text-text-muted hover:text-teal transition-colors">
              Full timeline →
            </Link>
          </div>
          <div className="h-48">
            {timeline ? (
              <HealthPulseRiver data={timeline} onHover={setHoveredMonth} />
            ) : (
              <div className="skeleton h-full rounded-lg" />
            )}
          </div>
          {hoveredMonth && hoveredMonth.eventCount > 0 && (
            <p className="font-mono text-xs text-text-muted animate-fade-in">
              {hoveredMonth.month} · {hoveredMonth.eventCount} event(s) ·
              max criticality <span className="text-coral">{hoveredMonth.criticalityMax}</span>
            </p>
          )}
        </div>

        {/* Anomalies */}
        <div className="mv-card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">⚠️ Anomalies</h2>
            <span className="badge-coral">{anomalies?.length || 0}</span>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-56">
            {aLoading && <CardSkeleton />}
            {!aLoading && !anomalies?.length && <EmptyState message="No anomalies detected" icon="✅" />}
            {anomalies?.map((a) => <AnomalyCard key={a._id} anomaly={a} />)}
          </div>
        </div>
      </div>

      {/* Recent documents */}
      <div className="mv-card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Recent Documents</h2>
          <Link to="/app/records" className="text-xs text-text-muted hover:text-teal transition-colors">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dLoading
            ? Array(3).fill(0).map((_, i) => <CardSkeleton key={i} />)
            : docsResult?.docs.length === 0
              ? <EmptyState message="No documents yet. Upload one!" icon="📤" />
              : docsResult?.docs.map((doc) => (
                  <DocumentCard key={doc._id} doc={doc} onClick={() => setSelectedDoc(doc)} />
                ))
          }
        </div>
      </div>

      {/* Quick chat prompt */}
      <div className="mv-card flex items-center justify-between gap-4">
        <div>
          <h2 className="section-title mb-1">💬 Ask your records</h2>
          <p className="font-body text-sm text-text-muted">
            "What were my last HbA1c results?" · "Do my medications interact?"
          </p>
        </div>
        <Link to="/app/chat" className="btn-primary flex-shrink-0">
          Start chatting →
        </Link>
      </div>

      {/* Document SlideOver */}
      {selectedDoc && (
        <DocSlideOver doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}

function DocSlideOver({ doc, onClose }: { doc: MedDocument; onClose: () => void }) {
  const { isDoctor } = useMode();

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-surface border-l border-border-mid overflow-y-auto animate-slide-in-right p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <span className="badge-muted text-xs mb-2 inline-block">{doc.documentType.replace('_', ' ')}</span>
            <h2 className="font-sans font-bold text-xl text-text-primary">{doc.filename}</h2>
            {doc.documentDate && (
              <p className="font-mono text-xs text-text-faint mt-1">
                {new Date(doc.documentDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary text-xl p-1">✕</button>
        </div>

        {/* Summary */}
        <div className="mv-card">
          <p className="font-body text-sm text-text-muted leading-relaxed">
            {isDoctor ? doc.summaryClinical : doc.summaryPlain}
          </p>
        </div>

        {/* Key findings */}
        {doc.keyFindings.length > 0 && (
          <div>
            <h3 className="section-title text-sm mb-3">Key Findings</h3>
            <ul className="space-y-2">
              {doc.keyFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 font-body text-sm text-text-muted">
                  <span className="text-teal mt-0.5">→</span> {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lab values */}
        {doc.labValues.length > 0 && (
          <div>
            <h3 className="section-title text-sm mb-3">Lab Values</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border-dim text-text-faint text-left">
                    <th className="pb-2 pr-4">Test</th>
                    <th className="pb-2 pr-4">Value</th>
                    <th className="pb-2 pr-4">Unit</th>
                    <th className="pb-2">Range</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {doc.labValues.map((lv, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border-dim/50 ${lv.is_abnormal ? 'text-coral' : 'text-text-muted'}`}
                    >
                      <td className="py-1.5 pr-4">{lv.test_name}</td>
                      <td className="py-1.5 pr-4 font-semibold">{lv.value}</td>
                      <td className="py-1.5 pr-4">{lv.unit}</td>
                      <td className="py-1.5 text-text-faint">{lv.reference_range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Medications */}
        {doc.medications.length > 0 && (
          <div>
            <h3 className="section-title text-sm mb-3">Medications</h3>
            <div className="space-y-2">
              {doc.medications.map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2">
                  <div>
                    <span className="font-mono text-sm text-text-primary">{m.name} {m.dosage}</span>
                    <p className="font-body text-xs text-text-muted">{m.frequency}</p>
                  </div>
                  {m.duration && (
                    <span className="font-mono text-xs text-text-faint">{m.duration}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
