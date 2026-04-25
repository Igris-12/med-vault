import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard, Activity, FolderOpen, Pill, MessageSquare,
  Upload, Smartphone, Settings, HeartPulse,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/app/dashboard',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/timeline',            icon: Activity,        label: 'Timeline' },
  { to: '/app/records',             icon: FolderOpen,      label: 'Records' },
  { to: '/app/prescriptions',       icon: Pill,            label: 'Prescriptions' },
  { to: '/app/chat',                icon: MessageSquare,   label: 'AI Chat' },
  { to: '/app/upload',              icon: Upload,          label: 'Upload' },
  { to: '/app/reminders/dashboard', icon: Smartphone,      label: 'WA Reminders' },
];

export function SideNav() {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.nav
      className="fixed left-0 top-0 h-screen z-40 flex flex-col"
      animate={{ width: expanded ? 220 : 64 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{ background: 'var(--dd-sidebar-bg)', overflow: 'hidden' }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.2)' }}>
          <HeartPulse size={16} color="#fff" />
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.span className="ml-3 font-bold text-base text-white whitespace-nowrap"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}>
              MedVault
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <div className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-hidden">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} title={!expanded ? label : undefined}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`side-nav-item ${isActive ? 'active' : ''}`}>
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  <Icon size={18} color={isActive ? '#fff' : 'rgba(255,255,255,0.65)'} />
                </div>
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      className="text-sm font-medium whitespace-nowrap"
                      style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.7)' }}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}>
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </NavLink>
        ))}
      </div>

      {/* Settings */}
      <div className="px-2 pb-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <NavLink to="/app/reminders/settings">
          {({ isActive }) => (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className={`side-nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={18} color={isActive ? '#fff' : 'rgba(255,255,255,0.65)'} />
              <AnimatePresence>
                {expanded && (
                  <motion.span className="text-sm font-medium text-white/70 whitespace-nowrap"
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}>
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </NavLink>
      </div>
    </motion.nav>
  );
}
