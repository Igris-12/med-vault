import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import type { ReminderChartDataPoint } from '../../types/reminders';

interface ReminderChartProps {
  data: ReminderChartDataPoint[];
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs font-mono"
      style={{
        background: 'var(--dd-card)',
        border: '1px solid var(--dd-border-active)',
        boxShadow: '0 8px 32px var(--dd-hover-overlay)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p className="font-semibold mb-2" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</p>
      {payload.map(entry => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span style={{ color: 'var(--dd-text-muted)', fontFamily: 'Inter, system-ui, sans-serif' }}>{entry.name}:</span>
          <span style={{ color: entry.color }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ReminderChart({ data }: ReminderChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="w-full"
      data-cursor="card"
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--dd-border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--dd-text-muted)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
            axisLine={{ stroke: 'var(--dd-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--dd-text-muted)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--dd-text-muted)' }}
          />
          <Line
            type="monotone"
            dataKey="delivered"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={{ fill: '#22c55e', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#22c55e' }}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="sent"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#3b82f6' }}
            isAnimationActive={true}
            animationDuration={1400}
            animationEasing="ease-out"
            strokeDasharray="5 3"
          />
          <Line
            type="monotone"
            dataKey="failed"
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={true}
            animationDuration={1600}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="scheduled"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={true}
            animationDuration={1800}
            animationEasing="ease-out"
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
