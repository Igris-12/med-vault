import { motion } from 'framer-motion';
import { CheckCheck, Clock, AlertCircle } from 'lucide-react';
import type { ReminderStatus } from '../../types/reminders';

interface WhatsAppBubbleProps {
  message: string;
  time?: string;
  status?: ReminderStatus;
  animate?: boolean;
  className?: string;
  senderName?: string;
}

const statusConfig: Record<ReminderStatus, { icon: React.ReactNode; label: string; color: string }> = {
  scheduled: {
    icon: <Clock size={12} />,
    label: 'Scheduled',
    color: '#94a3b8',
  },
  sending: {
    icon: <Clock size={12} className="animate-spin" />,
    label: 'Sending…',
    color: '#94a3b8',
  },
  sent: {
    icon: <CheckCheck size={12} />,
    label: 'Sent',
    color: '#94a3b8',
  },
  delivered: {
    icon: <CheckCheck size={12} />,
    label: 'Delivered',
    color: '#22c55e',
  },
  failed: {
    icon: <AlertCircle size={12} />,
    label: 'Failed',
    color: '#ef4444',
  },
  pending: {
    icon: <Clock size={12} />,
    label: 'Pending',
    color: '#94a3b8',
  },
};

export function WhatsAppBubble({
  message,
  time,
  status = 'delivered',
  animate = true,
  className = '',
  senderName,
}: WhatsAppBubbleProps) {
  const cfg = statusConfig[status];
  const displayTime = time ?? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const bubble = (
    <div
      className={`relative max-w-xs md:max-w-sm ${className}`}
      data-cursor="card"
    >
      {/* WhatsApp chat header */}
      <div
        className="rounded-t-2xl rounded-br-2xl rounded-bl-sm px-4 py-3 shadow-sm relative z-10"
        style={{
          background: 'var(--dd-card)',
          border: '1px solid var(--dd-border-active)',
          boxShadow: '0 4px 16px var(--dd-hover-overlay)',
        }}
      >
        {senderName && (
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--dd-accent)' }}>{senderName}</p>
        )}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>
          {message}
        </p>

        {/* Footer: time + status */}
        <div className="flex items-center justify-end gap-1.5 mt-2">
          <span className="text-xs" style={{ color: 'var(--dd-text-dim)', fontSize: '11px' }}>{displayTime}</span>
          <span style={{ color: cfg.color }}>{cfg.icon}</span>
        </div>
      </div>

      {/* Triangle tail */}
      <div
        className="absolute -bottom-0 -left-2 w-3 h-3 z-0"
        style={{
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          background: 'var(--dd-border-active)',
        }}
      />
    </div>
  );

  if (!animate) return bubble;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
    >
      {bubble}
    </motion.div>
  );
}
