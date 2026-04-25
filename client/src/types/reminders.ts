// ─── Reminder Types ───────────────────────────────────────────────────────────

export type ReminderStatus = 'scheduled' | 'sending' | 'sent' | 'delivered' | 'failed' | 'pending';

export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  message: string;
  phone: string;
  scheduledAt: string; // ISO string
  status: ReminderStatus;
  frequency: ReminderFrequency;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  errorReason?: string;
  tag?: string;
}

export interface ActivityItem {
  id: string;
  reminderId: string;
  message: string;
  phone: string;
  status: ReminderStatus;
  timestamp: string;
  tag?: string;
}

export interface ReminderChartDataPoint {
  date: string; // e.g. "Mon", "Tue"
  sent: number;
  delivered: number;
  failed: number;
  scheduled: number;
}

export interface ReminderStats {
  sentToday: number;
  upcoming: number;
  completed: number;
  failed: number;
}

export interface ReminderFormData {
  message: string;
  phone: string;
  scheduledAt: string;
  frequency: ReminderFrequency;
  tag?: string;
}

export interface CursorState {
  x: number;
  y: number;
  isHovering: boolean;
  isClicking: boolean;
  variant: 'default' | 'button' | 'card' | 'text';
}
