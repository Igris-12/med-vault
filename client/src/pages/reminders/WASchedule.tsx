import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { ReminderForm } from '../../components/reminders/ReminderForm';
import { BackButton } from '../../components/shared/BackButton';

const TEMPLATES = [
  '⏰ Reminder: Meeting at 5 PM', '💊 Take your medication now',
  '🏋️ Gym time! 15 minutes left', '📞 Call Mom today',
  '📋 Project deadline tomorrow', '🔔 Doctor appointment reminder',
  '💧 Time to drink water!', '📚 Study session starts now',
];

export default function WASchedule() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <BackButton to="/app/reminders/dashboard" />
        <div className="flex items-center gap-3 mt-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--dd-accent-dim)' }}>
            <Send size={18} style={{ color: 'var(--dd-accent)' }} />
          </div>
          <h1 className="font-bold text-2xl" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Schedule a Reminder
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--dd-text-muted)', marginLeft: '3.25rem' }}>
          Compose, schedule, and deliver via WhatsApp automatically.
        </p>
      </motion.div>

      {/* Tip */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mv-card flex items-start gap-3"
        style={{ padding: '16px', background: 'var(--dd-accent-dim)', borderColor: 'var(--dd-border-active)' }}>
        <Sparkles size={18} style={{ color: 'var(--dd-accent)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--dd-accent)' }}>Pro Tip</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--dd-text-muted)' }}>
            Start messages with emoji — ⏰ time, 💊 medication, 🏋️ fitness. Use recurring frequency to automate.
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <ReminderForm />
      </motion.div>

      {/* Templates */}
      <motion.div className="mv-card" style={{ padding: '20px' }}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <p className="font-semibold text-sm mb-3" style={{ color: 'var(--dd-text)' }}>Quick Templates</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(tpl => (
            <motion.button key={tpl} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>
              {tpl}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
