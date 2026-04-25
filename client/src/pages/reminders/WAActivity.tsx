import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityFeed } from '../../components/reminders/ActivityFeed';
import { MOCK_ACTIVITY } from '../../mock/mockReminders';
import type { ReminderStatus } from '../../types/reminders';
import { BackButton } from '../../components/shared/BackButton';

const TABS: { label: string; value: ReminderStatus | 'all'; color: string }[] = [
  { label: 'All',       value: 'all',       color: 'var(--dd-accent)' },
  { label: 'Scheduled', value: 'scheduled', color: '#3b82f6' },
  { label: 'Delivered', value: 'delivered', color: '#22c55e' },
  { label: 'Sent',      value: 'sent',      color: '#94a3b8' },
  { label: 'Failed',    value: 'failed',    color: '#f43f5e' },
];

export default function WAActivity() {
  const [active, setActive] = useState<ReminderStatus | 'all'>('all');

  const filtered = active === 'all' ? MOCK_ACTIVITY : MOCK_ACTIVITY.filter(a => a.status === active);
  const counts = TABS.reduce((acc, t) => {
    acc[t.value] = t.value === 'all' ? MOCK_ACTIVITY.length : MOCK_ACTIVITY.filter(a => a.status === t.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <BackButton to="/app/reminders/dashboard" label="Dashboard" />
          <div>
            <h1 className="font-bold text-2xl" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Activity Feed
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--dd-text-muted)' }}>
              Real-time log of all WhatsApp reminder events
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {[
          { label: 'Total', value: MOCK_ACTIVITY.length, color: 'var(--dd-accent)' },
          { label: 'Delivered', value: MOCK_ACTIVITY.filter(a => a.status === 'delivered').length, color: '#22c55e' },
          { label: 'Scheduled', value: MOCK_ACTIVITY.filter(a => a.status === 'scheduled').length, color: '#3b82f6' },
          { label: 'Failed', value: MOCK_ACTIVITY.filter(a => a.status === 'failed').length, color: '#f43f5e' },
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
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              }}>
              {tab.label}
              <span className="px-1.5 py-0.5 rounded-full font-mono text-xs font-bold"
                style={{ background: 'var(--dd-surface)', color: isActive ? tab.color : 'var(--dd-text-dim)' }}>
                {counts[tab.value]}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Feed */}
      <motion.div className="mv-card" style={{ padding: '20px' }}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-4xl">📭</span>
                <p className="text-sm" style={{ color: 'var(--dd-text-muted)' }}>No activity in this category</p>
              </div>
            ) : (
              <ActivityFeed items={filtered} showAll />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
