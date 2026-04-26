import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, CartesianGrid,
} from 'recharts';
import { useState } from 'react';
import type { TimelineMonth } from '../../types/api';

function critToColor(score: number): string {
  if (score <= 3) return '#00E5C3';
  if (score <= 6) return '#F5A623';
  return '#FF4A6E';
}

interface Props {
  data: TimelineMonth[];
  onHover?: (month: TimelineMonth | null) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as TimelineMonth;
  return (
    <div className="bg-card border border-border-mid rounded-lg px-4 py-3 shadow-card text-sm">
      <p className="font-sans font-semibold text-text-primary mb-1">{label}</p>
      <p className="font-mono text-xs text-text-muted">
        Max criticality: <span className="text-text-primary">{d.criticalityMax}</span>
      </p>
      <p className="font-mono text-xs text-text-muted">
        Events: <span className="text-text-primary">{d.eventCount}</span>
      </p>
      {d.types.length > 0 && (
        <p className="font-mono text-xs text-text-faint mt-1">{d.types.join(', ')}</p>
      )}
    </div>
  );
};

export function HealthPulseRiver({ data, onHover }: Props) {
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  // Show every 3rd label to avoid crowding
  const tickFormatter = (_: string, index: number) =>
    index % 3 === 0 ? data[index]?.month || '' : '';

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
          onMouseMove={(state) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const s = state as any;
            if (s.activePayload) {
              const d = s.activePayload[0]?.payload as TimelineMonth;
              setActiveMonth(d?.month || null);
              onHover?.(d || null);
            }
          }}
          onMouseLeave={() => {
            setActiveMonth(null);
            onHover?.(null);
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#4A5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickFormatter={tickFormatter}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fill: '#4A5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          {activeMonth && (
            <ReferenceLine
              x={activeMonth}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          )}
          <Bar dataKey="criticalityMax" radius={[3, 3, 0, 0]} maxBarSize={18}>
            {data.map((entry) => (
              <Cell
                key={entry.month}
                fill={critToColor(entry.criticalityMax)}
                opacity={entry.eventCount === 0 ? 0.15 : 0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
