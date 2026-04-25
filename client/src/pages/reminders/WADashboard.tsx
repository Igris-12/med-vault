import { motion } from 'framer-motion';
import { Send, Clock, CheckCircle, XCircle, TrendingUp, ArrowRight, MessageSquare, BarChart3, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReminderCard } from '../../components/reminders/ReminderCard';
import { ReminderChart } from '../../components/reminders/ReminderChart';
import { ActivityFeed } from '../../components/reminders/ActivityFeed';
import { WhatsAppBubble } from '../../components/reminders/WhatsAppBubble';
import { MOCK_REMINDER_STATS, MOCK_CHART_DATA, MOCK_ACTIVITY } from '../../mock/mockReminders';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/* Removed inline card styles to use .mv-card class */

export default function WADashboard() {
  const statCards = [
    { icon: <Send size={20} />, value: MOCK_REMINDER_STATS.sentToday, label: 'Sent Today', sublabel: 'via WhatsApp', color: '#22c55e', glowColor: 'rgba(34,197,94,0.15)', trend: { value: 12, label: '' }, delay: 0 },
    { icon: <Clock size={20} />, value: MOCK_REMINDER_STATS.upcoming, label: 'Upcoming', sublabel: 'next 24h', color: '#6577f3', glowColor: 'rgba(101,119,243,0.15)', trend: { value: 3, label: '' }, delay: 0.07 },
    { icon: <CheckCircle size={20} />, value: MOCK_REMINDER_STATS.completed, label: 'Completed', sublabel: 'all time', color: '#10b981', glowColor: 'rgba(16,185,129,0.15)', trend: { value: 8, label: '' }, delay: 0.14 },
    { icon: <XCircle size={20} />, value: MOCK_REMINDER_STATS.failed, label: 'Failed', sublabel: 'needs attention', color: '#f43f5e', glowColor: 'rgba(244,63,94,0.12)', trend: { value: -2, label: '' }, delay: 0.21 },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div className="flex items-start justify-between flex-wrap gap-4"
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="font-bold text-2xl md:text-3xl" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {getGreeting()}, Alex 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--dd-text-muted)' }}>Your WhatsApp reminder command center</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app/reminders/activity">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="btn-ghost">
              <BarChart3 size={14} /> Activity
            </motion.button>
          </Link>
          <Link to="/app/reminders/schedule">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="btn-primary" style={{ padding: '8px 20px' }}>
              <Send size={14} /> New Reminder
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(c => <ReminderCard key={c.label} {...c} />)}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Chart */}
        <motion.div className="xl:col-span-2 mv-card" style={{ padding: '20px' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--dd-accent-dim)' }}>
                <TrendingUp size={16} style={{ color: 'var(--dd-accent)' }} />
              </div>
              <div>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--dd-text)' }}>Reminder Activity</h2>
                <p className="text-xs" style={{ color: 'var(--dd-text-muted)' }}>Last 7 days overview</p>
              </div>
            </div>
            <Link to="/app/reminders/activity" className="flex items-center gap-1 text-xs" style={{ color: 'var(--dd-text-muted)' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <ReminderChart data={MOCK_CHART_DATA} />
        </motion.div>

        {/* Side column */}
        <motion.div className="flex flex-col gap-4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <div className="mv-card flex flex-col gap-3" style={{ padding: '16px' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--dd-text)' }}>Latest Delivered</p>
            </div>
            <WhatsAppBubble message="💊 Take your medication — Metformin 500mg with dinner." status="delivered" animate />
          </div>

          <div className="mv-card flex flex-col gap-2" style={{ padding: '16px' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--dd-text)' }}>Quick Actions</p>
            {[
              { to: '/app/reminders/schedule', label: 'Schedule Reminder', icon: <Send size={13} />, color: '#22c55e' },
              { to: '/app/reminders/activity', label: 'Activity Feed', icon: <Zap size={13} />, color: 'var(--dd-accent)' },
              { to: '/app/reminders/settings', label: 'Settings', icon: <MessageSquare size={13} />, color: '#f43f5e' },
            ].map(item => (
              <Link key={item.label} to={item.to}>
                <motion.div whileHover={{ x: 3, borderColor: 'transparent' }} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer"
                  style={{ border: '1.5px solid var(--dd-border)', transition: 'border-color 0.2s' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--dd-surface)' }}>
                    <span style={{ color: item.color }}>{item.icon}</span>
                  </div>
                  <span className="text-sm" style={{ color: 'var(--dd-text-muted)' }}>{item.label}</span>
                  <ArrowRight size={13} className="ml-auto" style={{ color: 'var(--dd-text-dim)' }} />
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Activity Feed */}
      <motion.div className="mv-card" style={{ padding: '20px' }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: 'var(--dd-text)' }}>Recent Activity</h2>
          <Link to="/app/reminders/activity" className="flex items-center gap-1 text-xs" style={{ color: 'var(--dd-text-muted)' }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <ActivityFeed items={MOCK_ACTIVITY} maxItems={5} />
      </motion.div>
    </div>
  );
}
