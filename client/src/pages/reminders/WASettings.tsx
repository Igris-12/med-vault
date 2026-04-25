import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Palette, CheckCheck } from 'lucide-react';
import { useAppTheme } from '../../context/ThemeStateContext';
import { THEMES } from '../../context/ThemeContext';
import { BackButton } from '../../components/shared/BackButton';

const TABS = [
  { id: 'profile', label: 'Profile', icon: <User size={14} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={14} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield size={14} /> },
];

/* Using .mv-card, .mv-input, .btn-primary from globals.css */

function ProfileTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--dd-accent), #7c3aed)' }}>A</div>
        </div>
        <div>
          <p className="font-bold text-lg" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>Alex Kumar</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--dd-text-muted)' }}>alex@medvault.app</p>
          <button className="text-xs mt-2 px-3 py-1 rounded-lg font-medium"
            style={{ background: 'var(--dd-accent-dim)', color: 'var(--dd-accent)', border: '1px solid var(--dd-border-active)', cursor: 'pointer' }}>
            Change Photo
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[['Full Name', 'Alex Kumar'], ['Email', 'alex@medvault.app'], ['Phone', '+91 98765 43210'], ['WhatsApp', '+91 98765 43210']].map(([label, val]) => (
          <div key={label}>
            <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--dd-text-muted)' }}>{label}</label>
            <input defaultValue={val} className="mv-input" />
          </div>
        ))}
      </div>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        className="btn-primary self-start">
        Save Changes
      </motion.button>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setThemeById } = useAppTheme();
  return (
    <div className="flex flex-col gap-5">
      <p className="font-semibold text-sm" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>Choose Theme</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {THEMES.map(t => (
          <motion.button key={t.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            onClick={() => setThemeById(t.id)}
            className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
            style={{
              background: theme.id === t.id ? t.accent + '12' : 'var(--dd-surface)',
              border: `2px solid ${theme.id === t.id ? t.accent + '50' : 'var(--dd-border)'}`,
              cursor: 'pointer',
            }}>
            {/* Color preview dots */}
            <div className="flex gap-1 flex-shrink-0">
              {t.preview.map((c, i) => (
                <div key={i} className="w-4 h-4 rounded-full" style={{ background: c, border: '2px solid rgba(0,0,0,0.12)' }} />
              ))}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>{t.label}</p>
              {t.isLight && <p className="text-xs" style={{ color: 'var(--dd-text-muted)' }}>Light Mode</p>}
            </div>
            {theme.id === t.id && <CheckCheck size={16} style={{ color: t.accent }} />}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [toggles, setToggles] = useState({ delivered: true, failed: true, upcoming: true, marketing: false });
  return (
    <div className="flex flex-col gap-3">
      {[
        { key: 'delivered', label: 'Delivery Confirmations', desc: 'Get notified when reminders are delivered' },
        { key: 'failed',    label: 'Failed Deliveries',      desc: 'Alert when a reminder fails to send' },
        { key: 'upcoming',  label: 'Upcoming Reminders',     desc: '15 min preview before scheduled reminder' },
        { key: 'marketing', label: 'Product Updates',        desc: 'News and feature announcements' },
      ].map(item => (
        <div key={item.key} className="mv-card flex items-center justify-between" style={{ padding: '16px' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>{item.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--dd-text-muted)' }}>{item.desc}</p>
          </div>
          <div className="w-11 h-6 rounded-full relative cursor-pointer flex-shrink-0 ml-4 transition-colors"
            style={{ background: toggles[item.key as keyof typeof toggles] ? 'var(--dd-accent)' : 'var(--dd-border)' }}
            onClick={() => setToggles(t => ({ ...t, [item.key]: !t[item.key as keyof typeof toggles] }))}>
            <motion.div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
              animate={{ left: toggles[item.key as keyof typeof toggles] ? '22px' : '2px' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WASettings() {
  const [tab, setTab] = useState('profile');

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <BackButton to="/app/reminders/dashboard" label="Dashboard" />
          <div>
            <h1 className="font-bold text-2xl" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>Settings</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--dd-text-muted)' }}>Manage your profile, appearance, and preferences</p>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar tabs */}
        <motion.div className="lg:w-48 flex lg:flex-col gap-1 flex-wrap"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          {TABS.map(t => (
            <motion.button key={t.id} whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tab === t.id ? 'var(--dd-accent-dim)' : 'transparent',
                border: `1px solid ${tab === t.id ? 'var(--dd-border-active)' : 'transparent'}`,
                color: tab === t.id ? 'var(--dd-accent)' : 'var(--dd-text-muted)',
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
              {t.icon} {t.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Content card */}
        <motion.div className="mv-card flex-1" style={{ padding: '24px' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {tab === 'profile'      && <ProfileTab />}
          {tab === 'appearance'   && <AppearanceTab />}
          {tab === 'notifications'&& <NotificationsTab />}
          {tab === 'privacy'      && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Shield size={36} style={{ color: 'var(--dd-accent)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--dd-text-muted)' }}>Privacy settings coming soon</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
