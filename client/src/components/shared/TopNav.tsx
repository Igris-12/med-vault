import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Settings, Command, LogOut, User, Clock, X } from 'lucide-react';
import { useAppTheme } from '../../context/ThemeStateContext';
import { THEMES, applyThemeVars } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

/* ─── Shared dropdown panel ─── */
const Panel = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 200,
    background: 'var(--dd-card)', border: '1px solid var(--dd-border)',
    borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
    minWidth: 280, overflow: 'hidden', ...style,
  }}>
    {children}
  </div>
);

/* ─── Page title map ─── */
const PAGE_TITLES: Record<string, string> = {
  '/app/dashboard':           'Dashboard',
  '/app/timeline':            'Timeline',
  '/app/records':             'Records',
  '/app/prescriptions':       'Prescriptions',
  '/app/chat':                'AI Chat',
  '/app/upload':              'Upload',
  '/app/emergency':           'Emergency',
  '/app/reminders/dashboard': 'WA Dashboard',
  '/app/reminders/schedule':  'Schedule',
  '/app/reminders/activity':  'Activity',
  '/app/reminders/settings':  'Settings',
};

const MOCK_NOTIFS = [
  { id: 1, icon: '✅', title: 'Reminder Delivered', desc: 'Team standup reminder sent', time: '2m ago', read: false },
  { id: 2, icon: '⏰', title: 'Upcoming Reminder',  desc: 'Gym session in 15 minutes',  time: '10m ago', read: false },
  { id: 3, icon: '❌', title: 'Delivery Failed',    desc: 'Call Mom — number unreachable', time: '1h ago',  read: true },
  { id: 4, icon: '📋', title: 'New Reminder Set',   desc: 'Project deadline scheduled',  time: '2h ago',  read: true },
];

/* ─── Live clock ─── */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dd-text-muted)', fontFamily: 'var(--font-mono, monospace)', userSelect: 'none' }}>
      {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export function TopNav() {
  const { theme, setThemeById } = useAppTheme();
  const { logout, user } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();

  const [activeTheme, setActiveTheme] = useState(theme.id);
  const [notifs,      setNotifs]      = useState(MOCK_NOTIFS);
  const [showTheme,   setShowTheme]   = useState(false);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const themeRef   = useRef<HTMLDivElement>(null);
  const notifsRef  = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[location.pathname] ?? '';
  const unread    = notifs.filter(n => !n.read).length;

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current   && !themeRef.current.contains(e.target as Node))   setShowTheme(false);
      if (notifsRef.current  && !notifsRef.current.contains(e.target as Node))  setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Sync with context */
  useEffect(() => { setActiveTheme(theme.id); }, [theme.id]);

  const handleApplyTheme = (t: typeof THEMES[0]) => {
    applyThemeVars(t);
    setThemeById(t.id);
    setActiveTheme(t.id);
  };

  /* Remove old inline shared button styles */

  return (
    <header style={{
      position: 'fixed', top: 0, right: 0, left: 64, height: 56, zIndex: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--dd-bg)',
      borderBottom: '1px solid var(--dd-border)',
    }}>

      {/* ── Left: logo breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Clock size={14} style={{ color: 'var(--dd-accent)', opacity: 0.7 }} />
        <LiveClock />
        {pageTitle && (
          <>
            <span style={{ color: 'var(--dd-text-dim)', fontSize: 12 }}>/</span>
            <span style={{
              fontSize: 12, fontWeight: 600, color: 'var(--dd-accent)',
              background: 'var(--dd-accent-dim)', padding: '3px 12px',
              borderRadius: 100, border: '1px solid var(--dd-border-active)',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              {pageTitle}
            </span>
          </>
        )}
      </div>

      {/* ── Right: actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>

        {/* ⌘K Theme Switcher */}
        <div ref={themeRef} style={{ position: 'relative' }}>
          <button
            className={`nav-icon-btn ${showTheme ? 'active' : ''}`}
            onClick={() => { setShowTheme(v => !v); setShowNotifs(false); setShowProfile(false); }}
            title="Theme Switcher"
            style={{ width: 'auto', padding: '0 14px', gap: 6 }}
          >
            <Command size={13} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>Theme</span>
          </button>

          {showTheme && (
            <Panel style={{ minWidth: 300 }}>
              <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--dd-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', color: 'var(--dd-text-muted)', textTransform: 'uppercase' }}>
                  Choose Theme
                </span>
                <button onClick={() => setShowTheme(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dd-text-dim)' }}>
                  <X size={13} />
                </button>
              </div>
              {THEMES.map(t => (
                <div key={t.id} onClick={() => { handleApplyTheme(t); setShowTheme(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    cursor: 'pointer', borderBottom: '1px solid var(--dd-border)',
                    background: activeTheme === t.id ? 'var(--dd-accent-dim)' : 'transparent',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (activeTheme !== t.id) e.currentTarget.style.background = 'var(--dd-hover-overlay)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = activeTheme === t.id ? 'var(--dd-accent-dim)' : 'transparent'; }}
                >
                  {/* Colour preview bar */}
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', width: 48, height: 18, flexShrink: 0, border: '1px solid rgba(128,128,128,0.2)' }}>
                    <div style={{ flex: 1, background: t.preview[0] }} />
                    <div style={{ width: 14, background: t.preview[1] }} />
                    <div style={{ width: 6, background: t.preview[2] }} />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--dd-text)', flex: 1, fontFamily: 'Inter, system-ui, sans-serif' }}>{t.label}</span>
                  {activeTheme === t.id && (
                    <span style={{ fontSize: 10, color: t.accent, fontWeight: 700, background: t.accent + '22', padding: '2px 8px', borderRadius: 100 }}>
                      Active
                    </span>
                  )}
                </div>
              ))}
            </Panel>
          )}
        </div>

        {/* Bell — notification dropdown */}
        <div ref={notifsRef} style={{ position: 'relative' }}>
          <button
            className={`nav-icon-btn ${showNotifs ? 'active' : ''}`}
            title="Notifications"
            onClick={() => { setShowNotifs(v => !v); setShowTheme(false); setShowProfile(false); }}
          >
            <Bell size={15} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, background: '#ef4444',
                borderRadius: '50%', border: '2px solid var(--dd-bg)',
              }} />
            )}
          </button>

          {showNotifs && (
            <Panel style={{ minWidth: 320 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--dd-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={13} style={{ color: 'var(--dd-accent)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>Notifications</span>
                  {unread > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#ef4444', padding: '1px 7px', borderRadius: 100 }}>{unread}</span>
                  )}
                </div>
                <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dd-text-dim)' }}>
                  <X size={13} />
                </button>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifs.map(n => (
                  <div key={n.id}
                    onClick={() => setNotifs(p => p.map(x => x.id === n.id ? { ...x, read: true } : x))}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                      cursor: 'pointer', borderBottom: '1px solid var(--dd-border)',
                      opacity: n.read ? 0.55 : 1, transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--dd-hover-overlay)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--dd-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.desc}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: 'var(--dd-text-dim)', fontFamily: 'monospace' }}>{n.time}</span>
                      {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--dd-accent)' }} />}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid var(--dd-border)' }}>
                <button onClick={() => setNotifs(p => p.map(x => ({ ...x, read: true })))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--dd-accent)', fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Mark all as read
                </button>
              </div>
            </Panel>
          )}
        </div>

        {/* Gear → settings */}
        <button
          className="nav-icon-btn"
          title="Settings"
          onClick={() => { navigate('/app/reminders/settings'); setShowTheme(false); setShowNotifs(false); setShowProfile(false); }}
        >
          <Settings size={15} />
        </button>

        {/* Avatar / profile dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowProfile(v => !v); setShowTheme(false); setShowNotifs(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <div
              className={`nav-icon-btn ${showProfile ? 'active' : ''}`}
              style={{
                background: `linear-gradient(135deg, var(--dd-accent), #7c3aed)`,
                color: '#fff', fontWeight: 700, fontSize: 13,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
              A
            </div>
          </button>

          {showProfile && (
            <Panel>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--dd-border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>{user?.displayName || 'User'}</div>
                <div style={{ fontSize: 11, color: 'var(--dd-text-muted)', marginTop: 2 }}>{user?.email || 'user@example.com'}</div>
              </div>
              {[
                { icon: User, label: 'Profile', action: () => { navigate('/app/reminders/settings'); setShowProfile(false); } },
                { icon: Settings, label: 'Settings', action: () => { navigate('/app/reminders/settings'); setShowProfile(false); } },
              ].map(({ icon: Icon, label, action }) => (
                <div key={label} onClick={action}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--dd-border)', transition: 'background 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--dd-hover-overlay)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={14} style={{ color: 'var(--dd-text-muted)' }} />
                  <span style={{ fontSize: 13, color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</span>
                </div>
              ))}
              <div
                onClick={async () => { 
                  setShowProfile(false);
                  try {
                    await logout();
                    navigate('/', { replace: true });
                  } catch (err) {
                    console.error('Logout failed:', err);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <LogOut size={14} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Inter, system-ui, sans-serif' }}>Sign out</span>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </header>
  );
}
