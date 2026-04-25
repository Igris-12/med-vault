import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Clock, Phone, MessageSquare, CheckCircle, Loader2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { WhatsAppBubble } from './WhatsAppBubble';
import type { ReminderFormData, ReminderFrequency } from '../../types/reminders';

const FREQ_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: 'once',    label: 'Once' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const TAG_OPTIONS = ['Work', 'Health', 'Personal', 'Fitness', 'Finance', 'Family'];

interface ReminderFormProps {
  onSuccess?: (data: ReminderFormData) => void;
}

function triggerConfetti() {
  const colors = ['#6577f3', '#22c55e', '#3b82f6', '#f59e0b', '#f43f5e'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; pointer-events:none; z-index:9999;
      width:8px; height:8px; border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      background:${colors[Math.floor(Math.random() * colors.length)]};
      left:${Math.random() * 100}vw; top:${Math.random() * 40 + 30}vh;
    `;
    document.body.appendChild(el);
    const tx = (Math.random() - 0.5) * 300;
    const ty = -(Math.random() * 400 + 100);
    el.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${tx}px,${ty}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 600, easing: 'ease-out', fill: 'forwards' })
      .onfinish = () => el.remove();
  }
}

export function ReminderForm({ onSuccess }: ReminderFormProps) {
  const [form, setForm] = useState<ReminderFormData>({
    message: '', phone: '', scheduledAt: '', frequency: 'once', tag: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const formRef = useRef<HTMLDivElement>(null);

  const previewTime = form.scheduledAt
    ? new Date(form.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim() || !form.phone.trim() || !form.scheduledAt) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setStatus('loading');
    await new Promise(r => setTimeout(r, 1800));
    setStatus('success');
    triggerConfetti();
    toast.success('Reminder scheduled! WhatsApp message queued.', { icon: '✅', duration: 4000 });
    onSuccess?.(form);
    setTimeout(() => {
      setStatus('idle');
      setForm({ message: '', phone: '', scheduledAt: '', frequency: 'once', tag: '' });
    }, 3000);
  };

  // CSS-var aware input style
  const inputStyle: React.CSSProperties = {
    background: 'var(--dd-surface)',
    border: '1px solid var(--dd-border)',
    borderRadius: '12px',
    color: 'var(--dd-text)',
    padding: '11px 14px',
    fontSize: '14px',
    fontFamily: 'Inter, system-ui, sans-serif',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--dd-card)',
    border: '1px solid var(--dd-border)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--dd-text-muted)',
    fontSize: 12,
    fontFamily: 'var(--font-mono, monospace)',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  };

  return (
    <div ref={formRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ── Form ── */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--dd-accent-dim)' }}>
            <MessageSquare size={15} style={{ color: 'var(--dd-accent)' }} />
          </div>
          <h2 className="font-semibold text-base" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>
            New Reminder
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              className="flex flex-col items-center justify-center py-10 gap-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
                <CheckCircle size={52} color="#22c55e" />
              </motion.div>
              <p className="font-semibold text-base" style={{ color: '#22c55e' }}>Message Scheduled ✅</p>
              <p className="text-sm text-center" style={{ color: 'var(--dd-text-muted)' }}>
                Your WhatsApp reminder is queued and will be sent at the scheduled time.
              </p>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Message */}
              <div>
                <label style={labelStyle}><MessageSquare size={11} /> Message</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="⏰ Reminder: Your message here..." rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--dd-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--dd-accent-dim)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--dd-border)'; e.target.style.boxShadow = 'none'; }} />
              </div>
              {/* Phone */}
              <div>
                <label style={labelStyle}><Phone size={11} /> WhatsApp Number</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--dd-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--dd-accent-dim)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--dd-border)'; e.target.style.boxShadow = 'none'; }} />
              </div>
              {/* Time */}
              <div>
                <label style={labelStyle}><Clock size={11} /> Schedule Time</label>
                <input type="datetime-local" value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  style={{ ...inputStyle, colorScheme: 'light' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--dd-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--dd-accent-dim)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--dd-border)'; e.target.style.boxShadow = 'none'; }} />
              </div>
              {/* Frequency + Tag */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Frequency</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {FREQ_OPTIONS.map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setForm(f => ({ ...f, frequency: opt.value }))}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono transition-all"
                        style={{
                          background: form.frequency === opt.value ? 'var(--dd-accent-dim)' : 'var(--dd-surface)',
                          border: `1px solid ${form.frequency === opt.value ? 'var(--dd-border-active)' : 'var(--dd-border)'}`,
                          color: form.frequency === opt.value ? 'var(--dd-accent)' : 'var(--dd-text-muted)',
                          cursor: 'pointer',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}><Tag size={11} /> Tag</label>
                  <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                    style={{ ...inputStyle, padding: '8px 12px' }}>
                    <option value="">No tag</option>
                    {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {/* Submit */}
              <motion.button type="submit" disabled={status === 'loading'}
                whileHover={{ scale: 1.02, boxShadow: '0 0 24px var(--dd-accent-dim)' }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white mt-1"
                style={{
                  background: 'linear-gradient(135deg, var(--dd-accent) 0%, #7c3aed 100%)',
                  border: 'none',
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: status === 'loading' ? 0.8 : 1,
                  boxShadow: '0 4px 16px var(--dd-accent-dim)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}>
                {status === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Scheduling…</> : <><Send size={16} /> Schedule Reminder</>}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* ── WhatsApp Preview ── */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl p-4" style={cardStyle}>
          {/* Phone mockup */}
          <div className="rounded-xl overflow-hidden" style={{ border: '2px solid rgba(34,197,94,0.25)' }}>
            {/* Status bar */}
            <div className="px-4 py-2 flex items-center justify-between text-xs font-mono"
              style={{ background: '#075e54', color: '#fff' }}>
              <span>9:41</span><span>WhatsApp</span><span>●●●</span>
            </div>
            {/* Chat header */}
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#128c7e' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                style={{ background: 'rgba(255,255,255,0.2)' }}>🤖</div>
              <div>
                <p className="text-sm font-semibold text-white">Smart Reminder Bot</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>online</p>
              </div>
            </div>
            {/* Chat body */}
            <div className="min-h-36 p-4 flex flex-col justify-end"
              style={{ background: '#e5ddd5' }}>
              {form.message || form.phone || form.scheduledAt ? (
                <WhatsAppBubble
                  message={form.message || '(Your message will appear here)'}
                  time={previewTime === '—' ? undefined : previewTime}
                  status={form.scheduledAt ? 'scheduled' : 'pending'}
                  animate={false}
                  senderName="Smart Reminder Bot"
                />
              ) : (
                <p className="text-xs text-center py-4 font-body" style={{ color: 'rgba(0,0,0,0.35)' }}>
                  Fill in the form to see a live preview
                </p>
              )}
            </div>
            {/* Input bar */}
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#f0f0f0', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <div className="flex-1 rounded-full px-4 py-1.5 text-xs" style={{ background: '#fff', color: 'rgba(0,0,0,0.35)' }}>Message</div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
                <Send size={14} color="#fff" />
              </div>
            </div>
          </div>
          {/* Metadata chips */}
          {(form.phone || form.scheduledAt) && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-wrap gap-2">
              {form.phone && (
                <span className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                  <Phone size={10} /> {form.phone}
                </span>
              )}
              {form.scheduledAt && (
                <span className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                  <Clock size={10} /> {new Date(form.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              )}
              {form.tag && (
                <span className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--dd-accent-dim)', color: 'var(--dd-accent)' }}>
                  <Tag size={10} /> {form.tag}
                </span>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
