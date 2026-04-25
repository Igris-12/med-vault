import { motion, AnimatePresence } from 'framer-motion';
import { CheckCheck, Clock, AlertCircle, Calendar } from 'lucide-react';
import type { ActivityItem, ReminderStatus } from '../../types/reminders';

const STATUS_CONFIG: Record<ReminderStatus, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  scheduled: { icon: <Calendar size={11} />, label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  sending:   { icon: <Clock size={11} className="animate-spin" />, label: 'Sending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  sent:      { icon: <CheckCheck size={11} />, label: 'Sent', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  delivered: { icon: <CheckCheck size={11} />, label: 'Delivered', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  failed:    { icon: <AlertCircle size={11} />, label: 'Failed', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
  pending:   { icon: <Clock size={11} />, label: 'Pending', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
  showAll?: boolean;
}

export function ActivityFeed({ items, maxItems = 6, showAll = false }: ActivityFeedProps) {
  const displayed = showAll ? items : items.slice(0, maxItems);

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {displayed.map((item, index) => {
          const cfg = STATUS_CONFIG[item.status];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 26 }}
              whileHover={{ x: 3, background: 'var(--dd-card-hover)' }}
              className="flex items-start gap-3 rounded-xl p-3 cursor-pointer transition-colors"
              style={{ background: 'var(--dd-surface)', border: '1px solid var(--dd-border)' }}
            >
              {/* Status dot */}
              <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}80` }} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug truncate" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {item.message}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-mono" style={{ color: 'var(--dd-text-muted)' }}>{item.phone}</span>
                  {item.tag && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                      style={{ background: 'var(--dd-accent-dim)', color: 'var(--dd-accent)' }}>
                      {item.tag}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: status badge + time */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.icon}<span className="ml-0.5">{cfg.label}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--dd-text-dim)', fontFamily: 'var(--font-mono, monospace)', fontSize: 10 }}>
                  {timeAgo(item.timestamp)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
