import { useState } from 'react';
import { useTimeline } from '../api/records';
import { HealthPulseRiver } from '../components/viz/HealthPulseRiver';
import { ModeToggle } from '../components/shared/ModeToggle';
import type { TimelineMonth, DocumentType } from '../types/api';

const TYPE_FILTERS: { key: DocumentType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'lab_report', label: 'Lab Reports' },
  { key: 'prescription', label: 'Prescriptions' },
  { key: 'discharge_summary', label: 'Discharge' },
  { key: 'imaging', label: 'Imaging' },
  { key: 'vaccination', label: 'Vaccination' },
];

function critLabel(score: number) {
  if (score <= 3) return { label: 'Normal', cls: 'badge-teal' };
  if (score <= 6) return { label: 'Moderate', cls: 'badge-amber' };
  return { label: 'Critical', cls: 'badge-coral' };
}

export default function Timeline() {
  const [hoveredMonth, setHoveredMonth] = useState<TimelineMonth | null>(null);
  const [filter, setFilter] = useState<DocumentType | 'all'>('all');
  const { data: timeline, loading } = useTimeline(36);

  const filtered = (timeline || []).filter((m) =>
    filter === 'all' || m.types.includes(filter as DocumentType)
  );

  // Events to show in side panel
  const sideEvents = (timeline || [])
    .filter((m) => m.eventCount > 0)
    .filter((m) => filter === 'all' || m.types.includes(filter as DocumentType))
    .reverse();

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl text-text-primary">Health Story</h1>
          <p className="font-body text-sm text-text-muted mt-1">36-month health timeline</p>
        </div>
        <ModeToggle />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-body transition-all duration-150
              ${filter === key
                ? 'bg-teal text-teal-text font-medium'
                : 'bg-surface border border-border-dim text-text-muted hover:border-teal/40 hover:text-text-primary'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1">
        {/* River — 2/3 */}
        <div className="xl:col-span-2 mv-card flex flex-col gap-4">
          <h2 className="section-title">Criticality Over Time</h2>
          {loading ? (
            <div className="skeleton h-64 rounded-lg" />
          ) : (
            <div className="h-64">
              <HealthPulseRiver data={filtered} onHover={setHoveredMonth} />
            </div>
          )}

          {hoveredMonth && (
            <div className="animate-fade-in mv-card bg-card-hover border-teal/20">
              <div className="flex items-center justify-between mb-2">
                <p className="font-sans font-semibold text-text-primary">{hoveredMonth.month}</p>
                <span className={critLabel(hoveredMonth.criticalityMax).cls}>
                  {critLabel(hoveredMonth.criticalityMax).label}
                </span>
              </div>
              <p className="font-mono text-xs text-text-muted">
                {hoveredMonth.eventCount} event(s) ·
                Max criticality: <span className="text-text-primary">{hoveredMonth.criticalityMax}</span> ·
                Avg: <span className="text-text-primary">{hoveredMonth.criticalityAvg}</span>
              </p>
              {hoveredMonth.types.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {hoveredMonth.types.map((t) => (
                    <span key={t} className="badge-muted capitalize">{t.replace('_', ' ')}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Events feed — 1/3 */}
        <div className="mv-card flex flex-col gap-3 overflow-y-auto max-h-96 xl:max-h-none">
          <h2 className="section-title">Events</h2>
          {sideEvents.length === 0 && (
            <p className="font-body text-sm text-text-muted text-center py-8">
              No events for this filter
            </p>
          )}
          {sideEvents.map((m) => (
            <div
              key={m.month}
              onMouseEnter={() => setHoveredMonth(m)}
              className={`px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150
                ${hoveredMonth?.month === m.month
                  ? 'border-teal/40 bg-card-hover'
                  : 'border-border-dim hover:border-border-mid'
                }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-text-primary">{m.month}</span>
                <span className={`crit-dot flex-shrink-0 ${m.criticalityMax >= 7 ? 'bg-coral' : m.criticalityMax >= 4 ? 'bg-amber' : 'bg-teal'}`} />
              </div>
              <p className="font-body text-xs text-text-muted">
                {m.eventCount} event{m.eventCount !== 1 ? 's' : ''}
              </p>
              {m.types.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {m.types.map((t) => (
                    <span key={t} className="text-xs font-mono text-text-faint">
                      {t.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
