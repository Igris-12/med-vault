import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ReminderCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
  color?: string;
  glowColor?: string;
  delay?: number;
  trend?: { value: number; label: string };
}

export function ReminderCard({
  icon, value, label, sublabel, color = '#6577f3',
  glowColor = 'rgba(101,119,243,0.15)', delay = 0, trend,
}: ReminderCardProps) {
  return (
    <motion.div
      data-cursor="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -4, boxShadow: `0 12px 32px ${glowColor}` }}
      className="relative overflow-hidden rounded-2xl p-5 cursor-pointer"
      style={{
        background: 'var(--dd-card)',
        border: '1px solid var(--dd-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top color bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      {/* Background orb */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl" style={{ background: color }} />

      <div className="relative flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: color + '18', border: `1px solid ${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold"
            style={{
              background: trend.value >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)',
              color: trend.value >= 0 ? '#22c55e' : '#f43f5e',
            }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="mt-3 relative">
        <motion.p className="font-mono font-bold text-3xl" style={{ color }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.15 }}>
          {value}
        </motion.p>
        <p className="font-semibold text-sm mt-1" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--dd-text-muted)' }}>{sublabel}</p>
        )}
      </div>
    </motion.div>
  );
}
