import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAlerts } from '../api/records';
import { CardSkeleton, EmptyState } from '../components/shared/Skeleton';
import type { HealthAlert, AlertCategory, AlertSeverity } from '../types/api';

// ─── Config maps ────────────────────────────────────────────────────────────

const CATEGORY_META: Record<AlertCategory, { icon: string; label: string; description: string }> = {
  abnormal: {
    icon: '🔴',
    label: 'Abnormal Results',
    description: 'Lab values outside normal ranges',
  },
  sudden_change: {
    icon: '⚡',
    label: 'Sudden Changes',
    description: 'Significant shifts between readings',
  },
  missing_test: {
    icon: '📅',
    label: 'Missing Tests',
    description: 'Overdue or recommended screenings',
  },
  suggestion: {
    icon: '💡',
    label: 'Suggestions',
    description: 'Specialist referrals & lifestyle actions',
  },
};

const SEVERITY_STYLE: Record<AlertSeverity, { bar: string; badge: string; border: string; glow: string }> = {
  critical: {
    bar: 'bg-coral',
    badge: 'badge-coral',
    border: 'border-coral/30',
    glow: 'hover:shadow-coral-glow',
  },
  warning: {
    bar: 'bg-amber',
    badge: 'badge-amber',
    border: 'border-amber/30',
    glow: 'hover:shadow-[0_0_20px_rgba(245,166,35,0.15)]',
  },
  info: {
    bar: 'bg-teal',
    badge: 'badge-teal',
    border: 'border-teal/20',
    glow: 'hover:shadow-teal-glow',
  },
};

// ─── Single Alert Card ────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onDismiss,
}: {
  alert: HealthAlert;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_STYLE[alert.severity];
  const cat = CATEGORY_META[alert.category];

  return (
    <div
      className={`
        relative mv-card border ${sev.border} ${sev.glow}
        transition-all duration-200 cursor-pointer
        ${alert.dismissed ? 'opacity-40' : ''}
      `}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Left severity bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${sev.bar}`} />

      <div className="pl-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0 mt-0.5">{cat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={sev.badge + ' text-xs'}>{alert.severity}</span>
                <span className="badge-muted text-xs">{cat.label}</span>
                {alert.specialist && (
                  <span className="badge-teal text-xs">→ {alert.specialist}</span>
                )}
              </div>
              <h3 className="font-sans font-semibold text-sm text-text-primary leading-snug">
                {alert.title}
              </h3>
            </div>
          </div>

          {/* Chevron + dismiss */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-text-faint text-sm select-none">
              {expanded ? '▲' : '▼'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(alert._id); }}
              className="text-text-faint hover:text-coral text-sm transition-colors p-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body — always show short desc */}
        <p className="font-body text-sm text-text-muted leading-relaxed mt-2">
          {expanded ? alert.description : alert.description.split('.')[0] + '.'}
        </p>

        {/* Expanded: action + meta */}
        {expanded && (
          <div className="mt-4 animate-fade-in space-y-3">
            {(alert.action || alert.specialist) && (
              <div className={`rounded-lg px-4 py-3 ${alert.severity === 'critical' ? 'bg-coral/10 border border-coral/20' : alert.severity === 'warning' ? 'bg-amber/10 border border-amber/20' : 'bg-teal/10 border border-teal/20'}`}>
                <p className="font-sans text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  What to do
                </p>
                {alert.action && (
                  <p className="font-body text-sm text-text-primary leading-relaxed">
                    {alert.action}
                  </p>
                )}
                {alert.specialist && (
                  <div className="mt-3">
                    <Link
                      to={`/app/locator?type=doctor&specialty=${encodeURIComponent(alert.specialist)}`}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all
                        ${alert.severity === 'critical' ? 'bg-coral text-coral-text hover:bg-coral-light' :
                          alert.severity === 'warning' ? 'bg-amber text-amber-text hover:bg-yellow-400' :
                          'bg-teal text-teal-text hover:bg-teal-light'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>📍</span> Find {alert.specialist} Near Me
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs font-mono text-text-faint">
              {alert.relatedTest && (
                <span>🧪 {alert.relatedTest}</span>
              )}
              <span>
                {new Date(alert.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary Strip ────────────────────────────────────────────────────────────

function AlertSummaryStrip({ alerts }: { alerts: HealthAlert[] }) {
  const active = alerts.filter((a) => !a.dismissed);
  const counts = {
    critical: active.filter((a) => a.severity === 'critical').length,
    warning: active.filter((a) => a.severity === 'warning').length,
    info: active.filter((a) => a.severity === 'info').length,
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Critical', count: counts.critical, color: 'text-coral', bg: 'bg-coral/10 border-coral/20', icon: '🔴' },
        { label: 'Warnings', count: counts.warning, color: 'text-amber', bg: 'bg-amber/10 border-amber/20', icon: '⚠️' },
        { label: 'Insights', count: counts.info, color: 'text-teal', bg: 'bg-teal/10 border-teal/20', icon: '💡' },
      ].map(({ label, count, color, bg, icon }) => (
        <div key={label} className={`stat-card border ${bg} text-center`}>
          <span className="text-2xl">{icon}</span>
          <p className={`font-mono font-bold text-3xl ${color}`}>{count}</p>
          <p className="font-body text-xs text-text-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: AlertCategory[] = ['abnormal', 'sudden_change', 'missing_test', 'suggestion'];
const FILTER_ALL = 'all';

export default function Alerts() {
  const { data: rawAlerts, loading } = useAlerts();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<AlertCategory | typeof FILTER_ALL>(FILTER_ALL);
  const [showDismissed, setShowDismissed] = useState(false);

  const alerts = (rawAlerts || []).map((a) => ({
    ...a,
    dismissed: dismissed.has(a._id),
  }));

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const visibleAlerts = alerts
    .filter((a) => (showDismissed ? true : !a.dismissed))
    .filter((a) => filter === FILTER_ALL || a.category === filter);

  const activeCount = alerts.filter((a) => !a.dismissed).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl text-text-primary flex items-center gap-2">
            Alerts & Insights
            {activeCount > 0 && (
              <span className="badge-coral text-sm">{activeCount} active</span>
            )}
          </h1>
          <p className="font-body text-sm text-text-muted mt-1">
            AI-generated health alerts grounded in your uploaded records
          </p>
        </div>
        <button
          onClick={() => setShowDismissed((v) => !v)}
          className={`text-sm font-body transition-colors ${showDismissed ? 'text-teal' : 'text-text-faint hover:text-text-muted'}`}
        >
          {showDismissed ? '● Showing dismissed' : 'Show dismissed'}
        </button>
      </div>

      {/* Summary strip */}
      {!loading && alerts.length > 0 && <AlertSummaryStrip alerts={alerts} />}
      {loading && (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter(FILTER_ALL)}
          className={`px-3 py-1.5 rounded-full text-sm font-body transition-all duration-150
            ${filter === FILTER_ALL
              ? 'bg-teal text-teal-text font-medium'
              : 'bg-surface border border-border-dim text-text-muted hover:border-teal/40 hover:text-text-primary'
            }`}
        >
          All
        </button>
        {CATEGORY_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const count = alerts.filter((a) => !a.dismissed && a.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-body transition-all duration-150 flex items-center gap-1.5
                ${filter === cat
                  ? 'bg-teal text-teal-text font-medium'
                  : 'bg-surface border border-border-dim text-text-muted hover:border-teal/40 hover:text-text-primary'
                }`}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
              {count > 0 && (
                <span className={`text-xs font-mono ${filter === cat ? 'text-teal-text' : 'text-text-faint'}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alert groups */}
      {loading && (
        <div className="flex flex-col gap-3">
          {Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {!loading && visibleAlerts.length === 0 && (
        <EmptyState
          message={
            dismissed.size > 0 && !showDismissed
              ? 'All alerts dismissed — great job! Toggle "Show dismissed" to review.'
              : 'No alerts for this filter'
          }
          icon={dismissed.size > 0 ? '✅' : '📋'}
        />
      )}

      {!loading && CATEGORY_ORDER.map((cat) => {
        const catAlerts = visibleAlerts.filter((a) => a.category === cat);
        if (catAlerts.length === 0) return null;
        if (filter !== FILTER_ALL && filter !== cat) return null;

        const meta = CATEGORY_META[cat];
        return (
          <section key={cat}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg">{meta.icon}</span>
              <div>
                <h2 className="section-title text-base">{meta.label}</h2>
                <p className="font-body text-xs text-text-faint">{meta.description}</p>
              </div>
              <span className="ml-auto font-mono text-xs text-text-faint">
                {catAlerts.filter((a) => !a.dismissed).length} active
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {catAlerts.map((alert) => (
                <AlertCard key={alert._id} alert={alert} onDismiss={handleDismiss} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Footer note */}
      {!loading && alerts.length > 0 && (
        <p className="font-body text-xs text-text-faint text-center pb-4">
          🤖 Alerts are AI-generated from your uploaded records and are not a substitute for medical advice.
          Always consult a qualified healthcare professional.
        </p>
      )}
    </div>
  );
}
