import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Palette, CheckCheck, Save, Loader2, RefreshCw, Copy, Check, ExternalLink } from 'lucide-react';
import { useAppTheme } from '../../context/ThemeStateContext';
import { THEMES } from '../../context/ThemeContext';
import { BackButton } from '../../components/shared/BackButton';
import { useAuth } from '../../context/AuthContext';
import { getProfile, updateProfile, type UserProfile } from '../../api/users';
import { apiFetch } from '../../api/base';

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: <User size={14} /> },
  { id: 'appearance',   label: 'Appearance',    icon: <Palette size={14} /> },
  { id: 'notifications',label: 'Notifications', icon: <Bell size={14} /> },
  { id: 'privacy',      label: 'Privacy',       icon: <Shield size={14} /> },
];

/* ─── Profile Tab ─────────────────────────────────────────────────────────── */
function ProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '', bloodType: '', dateOfBirth: '', whatsappPhone: '', allergies: '',
  });

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setForm({
        name: p.name || user?.displayName || '',
        bloodType: p.bloodType || '',
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
        whatsappPhone: p.whatsappPhone || '',
        allergies: (p.allergies || []).join(', '),
      });
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: form.name, bloodType: form.bloodType,
        dateOfBirth: form.dateOfBirth || undefined,
        whatsappPhone: form.whatsappPhone || undefined,
        allergies: form.allergies.split(',').map((a) => a.trim()).filter(Boolean),
      } as Partial<UserProfile>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const initials = (form.name || user?.displayName || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-5">
        <div>
          {user?.photoURL
            ? <img src={user.photoURL} alt="avatar" className="w-20 h-20 rounded-2xl object-cover" style={{ border: '2px solid var(--dd-border)' }} />
            : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--dd-accent), #7c3aed)' }}>{initials}</div>
          }
        </div>
        <div>
          <p className="font-bold text-lg" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>{form.name || 'Loading…'}</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--dd-text-muted)' }}>{user?.email || ''}</p>
          {profile?.whatsappPhone && (
            <span className="text-xs mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(37,211,102,0.12)', color: '#22c55e', border: '1px solid rgba(37,211,102,0.3)' }}>
              📱 {profile.whatsappPhone}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
          { label: 'Blood Type', key: 'bloodType', type: 'text', placeholder: 'e.g. O+' },
          { label: 'Date of Birth', key: 'dateOfBirth', type: 'date', placeholder: '' },
          { label: 'WhatsApp Number', key: 'whatsappPhone', type: 'tel', placeholder: '+91 98765 43210' },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--dd-text-muted)' }}>{label}</label>
            <input type={type} value={form[key as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="mv-input" />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--dd-text-muted)' }}>Allergies <span style={{ color: 'var(--dd-text-dim)' }}>(comma-separated)</span></label>
          <input type="text" value={form.allergies} onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))} placeholder="Penicillin, Peanuts, Shellfish" className="mv-input" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-mono mb-1.5" style={{ color: 'var(--dd-text-muted)' }}>Email (read-only from Google)</label>
          <input type="email" value={user?.email || ''} disabled className="mv-input opacity-50 cursor-not-allowed" />
        </div>
      </div>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving} className="btn-primary self-start flex items-center gap-2">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
      </motion.button>
    </div>
  );
}

/* ─── Appearance Tab ──────────────────────────────────────────────────────── */
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
            style={{ background: theme.id === t.id ? t.accent + '12' : 'var(--dd-surface)', border: `2px solid ${theme.id === t.id ? t.accent + '50' : 'var(--dd-border)'}`, cursor: 'pointer' }}>
            <div className="flex gap-1 flex-shrink-0">
              {t.preview.map((c, i) => (<div key={i} className="w-4 h-4 rounded-full" style={{ background: c, border: '2px solid rgba(0,0,0,0.12)' }} />))}
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

/* ─── Notifications Tab ───────────────────────────────────────────────────── */
function NotificationsTab() {
  const [toggles, setToggles] = useState({ delivered: true, failed: true, upcoming: true, marketing: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then((p) => { if (p.notificationPrefs) setToggles(p.notificationPrefs); }).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await updateProfile({ notificationPrefs: toggles } as Partial<UserProfile>); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-3">
      {[
        { key: 'delivered', label: 'Delivery Confirmations', desc: 'Get notified when reminders are delivered' },
        { key: 'failed', label: 'Failed Deliveries', desc: 'Alert when a reminder fails to send' },
        { key: 'upcoming', label: 'Upcoming Reminders', desc: '15 min preview before scheduled reminder' },
        { key: 'marketing', label: 'Product Updates', desc: 'News and feature announcements' },
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
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving} className="btn-primary self-start flex items-center gap-2 mt-2">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? 'Saving…' : 'Save Preferences'}
      </motion.button>
    </div>
  );
}

/* ─── Privacy Tab ─────────────────────────────────────────────────────────── */
function PrivacyTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getProfile().then(setProfile).catch(console.error);
  }, []);

  const emergencyUrl = profile?.emergencyToken
    ? `${window.location.origin}/emergency/${profile.emergencyToken}`
    : '';

  const handleCopy = () => {
    if (emergencyUrl) {
      navigator.clipboard.writeText(emergencyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate emergency token? The old QR code link will stop working.')) return;
    setRegenerating(true);
    try {
      const res = await apiFetch<{ emergencyToken: string }>('/api/users/regenerate-token', { method: 'POST' });
      setProfile((p) => p ? { ...p, emergencyToken: res.emergencyToken } : p);
    } catch (err) {
      console.error('Regenerate failed:', err);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--dd-text)' }}>Emergency QR Access</h3>
        <p className="text-sm" style={{ color: 'var(--dd-text-muted)' }}>
          This unique link gives first responders read-only access to your blood type, allergies, and emergency contacts — no login required.
        </p>
      </div>

      {profile ? (
        <div className="mv-card flex flex-col gap-4" style={{ padding: '20px' }}>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--dd-surface)', border: '1px solid var(--dd-border)' }}>
            <code className="flex-1 text-xs break-all font-mono" style={{ color: 'var(--dd-text-muted)' }}>{emergencyUrl}</code>
            <button onClick={handleCopy} className="flex-shrink-0 p-2 rounded-lg transition-colors" style={{ background: 'var(--dd-accent-dim)', border: '1px solid var(--dd-border-active)' }}>
              {copied ? <Check size={14} style={{ color: 'var(--dd-accent)' }} /> : <Copy size={14} style={{ color: 'var(--dd-accent)' }} />}
            </button>
            <a href={emergencyUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-2 rounded-lg transition-colors" style={{ background: 'var(--dd-surface)', border: '1px solid var(--dd-border)' }}>
              <ExternalLink size={14} style={{ color: 'var(--dd-text-muted)' }} />
            </a>
          </div>

          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleRegenerate} disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer' }}>
              {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Regenerate Token
            </motion.button>
          </div>
          <p className="text-xs" style={{ color: 'var(--dd-text-faint)' }}>
            ⚠️ Regenerating will invalidate all printed QR codes. Print or save the new one after regenerating.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2" style={{ color: 'var(--dd-text-muted)' }}>
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      )}

      <div>
        <h3 className="font-semibold text-base mb-3" style={{ color: 'var(--dd-text)' }}>Emergency Contacts</h3>
        {profile?.emergencyContacts?.length ? (
          <div className="flex flex-col gap-2">
            {profile.emergencyContacts.map((c, i) => (
              <div key={i} className="mv-card flex items-center gap-4" style={{ padding: '14px' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background: 'var(--dd-accent)' }}>
                  {c.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--dd-text)' }}>{c.name}</p>
                  <p className="text-xs" style={{ color: 'var(--dd-text-muted)' }}>{c.relationship} · {c.phone}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--dd-text-muted)' }}>
            No emergency contacts added yet. Add them in the Profile tab.
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function WASettings() {
  const [tab, setTab] = useState('profile');

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <BackButton to="/app/reminders/dashboard" />
          <div>
            <h1 className="font-bold text-2xl" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>Settings</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--dd-text-muted)' }}>Manage your profile, appearance, and preferences</p>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-5">
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
                cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
              }}>
              {t.icon} {t.label}
            </motion.button>
          ))}
        </motion.div>

        <motion.div className="mv-card flex-1" style={{ padding: '24px' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {tab === 'profile'       && <ProfileTab />}
          {tab === 'appearance'    && <AppearanceTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'privacy'       && <PrivacyTab />}
        </motion.div>
      </div>
    </div>
  );
}




