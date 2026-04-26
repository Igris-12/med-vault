import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityFeed } from '../../components/reminders/ActivityFeed';
import { BackButton } from '../../components/shared/BackButton';
import { getReminders, type ReminderActivity } from '../../api/whatsapp';
import type { ReminderStatus } from '../../types/reminders';
import { Loader2 } from 'lucide-react';

const TABS: { label: string; value: ReminderStatus | 'all'; color: string }[] = [
  { label: 'All',       value: 'all',       color: 'var(--dd-accent)' },
  { label: 'Pending',   value: 'pending',   color: '#3b82f6' },
  { label: 'Delivered', value: 'delivered', color: '#22c55e' },
  { label: 'Sent',      value: 'sent',      color: '#94a3b8' },
  { label: 'Failed',    value: 'failed',    color: '#f43f5e' },
];

// Map DB Reminder to ActivityFeed's ActivityItem shape
function toActivityItem(r: ReminderActivity) {
  return {
    id:         r.id,
    reminderId: r.reminderId,
    message:    r.message,
    phone:      r.phone,
    status:     (r.status === 'pending' ? 'scheduled' : r.status) as ReminderStatus,
    timestamp:  r.timestamp,
    tag:        r.tag,
  };
}

export default function WAActivity() {
  const [active, setActive]   = useState<ReminderStatus | 'all'>('all');
  const [items, setItems]     = useState<ReminderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ total: 0, sent: 0, pending: 0, failed: 0, sentToday: 0 });

  useEffect(() => {
    setLoading(true);
    getReminders('all', 200)
      .then(res => {
        setItems(res?.items ?? []);
        setStats(res?.stats ?? { total: 0, sent: 0, pending: 0, failed: 0, sentToday: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = active === 'all'
    ? items
    : items.filter(r => {
        if (active === 'pending')   return r.status === 'pending';
        if (active === 'delivered') return r.status === 'sent' || r.status === 'delivered';
        if (active === 'sent')      return r.status === 'sent';
        if (active === 'failed')    return r.status === 'failed';
        return r.status === active;
      });

  const counts: Record<string, number> = {
    all:       items.length,
    pending:   items.filter(r => r.status === 'pending').length,
    delivered: items.filter(r => r.status === 'sent' || r.status === 'delivered').length,
    sent:      items.filter(r => r.status === 'sent').length,
    failed:    items.filter(r => r.status === 'failed').length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <BackButton to="/app/reminders/dashboard" />
          <div>
            <h1 className="font-bold text-2xl" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Activity Feed
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--dd-text-muted)' }}>
              Real-time log of your scheduled WhatsApp reminders
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {[
          { label: 'Total',     value: stats.total,    color: 'var(--dd-accent)' },
          { label: 'Delivered', value: stats.sent,     color: '#22c55e' },
          { label: 'Scheduled', value: stats.pending,  color: '#3b82f6' },
          { label: 'Failed',    value: stats.failed,   color: '#f43f5e' },
        ].map(s => (
          <div key={s.label} className="mv-card">
            <p className="font-mono font-bold text-2xl" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--dd-text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Filter tabs */}
      <motion.div className="flex items-center gap-2 flex-wrap"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        {TABS.map(tab => {
          const isActive = active === tab.value;
          return (
            <motion.button key={tab.value} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setActive(tab.value)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: isActive ? (tab.color === 'var(--dd-accent)' ? 'var(--dd-accent-dim)' : tab.color + '18') : 'var(--dd-card)',
                border: `1px solid ${isActive ? (tab.color === 'var(--dd-accent)' ? 'var(--dd-border-active)' : tab.color + '40') : 'var(--dd-border)'}`,
                color: isActive ? tab.color : 'var(--dd-text-muted)',
                cursor: 'pointer',
              }}>
              {tab.label}
              <span className="px-1.5 py-0.5 rounded-full font-mono text-xs font-bold"
                style={{ background: 'var(--dd-surface)', color: isActive ? tab.color : 'var(--dd-text-dim)' }}>
                {counts[tab.value] ?? 0}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Feed */}
      <motion.div className="mv-card" style={{ padding: '20px' }}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" className="flex flex-col items-center justify-center py-16 gap-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--dd-accent)' }} />
              <p className="text-sm" style={{ color: 'var(--dd-text-muted)' }}>Loading reminders…</p>
            </motion.div>
          ) : (
            <motion.div key={active}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-4xl">📭</span>
                  <p className="text-sm" style={{ color: 'var(--dd-text-muted)' }}>
                    {items.length === 0
                      ? 'No reminders yet. Schedule one from the Schedule page!'
                      : 'No reminders in this category'}
                  </p>
                </div>
              ) : (
                <ActivityFeed items={filtered.map(toActivityItem)} showAll />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
