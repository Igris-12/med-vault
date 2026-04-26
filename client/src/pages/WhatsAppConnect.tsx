// @refresh reset
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, CheckCircle, MessageCircle, Send, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { getWhatsAppStatus, getWhatsAppMessages } from '../api/whatsapp';
import type { WAMessage } from '../api/whatsapp';
import { linkWhatsApp } from '../api/users';

type Status = 'idle' | 'loading' | 'done' | 'error';

/* ── WhatsApp logo SVG ────────────────────────────────────────────────────── */
const WALogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/* ── Chat bubble ──────────────────────────────────────────────────────────── */
function WABubble({ msg }: { msg: WAMessage }) {
  const isOut = msg.direction === 'out';
  return (
    <motion.div
      className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        style={{
          maxWidth: '75%',
          padding: '8px 12px',
          borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isOut ? 'rgba(7,94,84,0.85)' : 'rgba(255,255,255,0.06)',
          border: isOut ? 'none' : '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {msg.mediaUrl && msg.mediaType?.startsWith('image/') && (
          <img src={msg.mediaUrl} alt="media" style={{ maxWidth: 200, borderRadius: 8, marginBottom: 4, display: 'block' }} />
        )}
        <p style={{ fontSize: 13, color: isOut ? '#e2ffe8' : 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: 0 }}>
          {msg.content}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
          <Clock size={9} style={{ color: isOut ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)' }} />
          <span style={{ fontSize: 10, color: isOut ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)' }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Connection form ──────────────────────────────────────────────────────── */
function ConnectForm({ onConnected }: { onConnected: (phone: string) => void }) {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLink() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await linkWhatsApp(phone);
      setStatus('done');
      onConnected(res.whatsappPhone);
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as Error).message || 'Something went wrong. Try again.');
    }
  }

  return (
    <motion.div
      className="mv-card flex flex-col gap-6"
      style={{ maxWidth: 480, margin: '0 auto' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* WA branding header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', flexShrink: 0,
          boxShadow: '0 0 24px rgba(37,211,102,0.4)',
        }}>
          <WALogo />
        </div>
        <div>
          <p className="font-bold text-base" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Connect WhatsApp
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--dd-text-muted)' }}>
            Link your number to query records from WhatsApp
          </p>
        </div>
      </div>

      {/* Feature list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
        {[
          '📋 Query medical history',
          '💊 Check medications',
          '📄 Upload docs by photo',
          '🆘 Emergency health card',
          '🧪 Lab results summary',
          '💡 Daily health tips',
        ].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--dd-text-muted)' }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          '⚠️ First, send "join <sandbox-keyword>" to +14155238886 on WhatsApp (required for Twilio sandbox)',
          'Enter your WhatsApp number below',
          'Click Connect — you\'ll get a confirmation message',
          'Reply to the bot to start chatting!'
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: 'var(--dd-accent-dim)', border: '1px solid var(--dd-border-active)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'var(--dd-accent)', fontFamily: 'monospace',
            }}>
              {i + 1}
            </div>
            <p style={{ fontSize: 13, color: 'var(--dd-text-muted)', lineHeight: 1.5, paddingTop: 2 }}>{step}</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleLink(); }}
          disabled={status === 'loading' || status === 'done'}
          className="mv-input flex-1 font-mono text-sm"
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLink}
          disabled={status === 'loading' || phone.replace(/\D/g, '').length < 10}
          className="btn-primary px-5 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ gap: 6, display: 'flex', alignItems: 'center' }}
        >
          {status === 'loading' ? (
            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Linking…</>
          ) : (
            <><Send size={14} /> Connect</>
          )}
        </motion.button>
      </div>

      {status === 'error' && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{errorMsg}</p>
          {errorMsg.toLowerCase().includes('unregistered') || errorMsg.toLowerCase().includes('sandbox') ? (
            <p style={{ fontSize: 11, color: '#f87171', margin: '4px 0 0' }}>
              💡 <strong>Fix:</strong> Open WhatsApp → message <strong>+14155238886</strong> → send <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: 3 }}>join</code> followed by the sandbox keyword, then try connecting again.
            </p>
          ) : null}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--dd-text-dim)', fontFamily: 'monospace' }}>
        You'll receive a WhatsApp confirmation on this number.
      </p>
    </motion.div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function WhatsAppConnectPage() {
  const [connected, setConnected] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* Fetch connection status on mount */
  useEffect(() => {
    (async () => {
      try {
        const status = await getWhatsAppStatus();
        setConnected(status.connected);
        setPhone(status.phone);
        if (status.connected) loadMessages();
      } catch {}
      finally { setStatusLoading(false); }
    })();
  }, []);

  /* Poll messages every 15s when connected */
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(loadMessages, 15000);
    return () => clearInterval(interval);
  }, [connected]);

  /* Socket listener removed — socket ref isn't stable across re-renders.
   * 15-second polling (above) handles live updates reliably. */

  /* Scroll to bottom when new messages arrive */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    setLoadingMsgs(true);
    try {
      const res = await getWhatsAppMessages(100);
      if (res.data) setMessages(res.data);
    } catch {}
    finally { setLoadingMsgs(false); }
  }

  const handleConnected = (newPhone: string) => {
    setConnected(true);
    setPhone(newPhone);
    loadMessages();
  };

  if (statusLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <RefreshCw size={20} style={{ color: 'var(--dd-accent)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="font-bold text-2xl" style={{ color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <WALogo />
              </div>
              WhatsApp Connect
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--dd-text-muted)' }}>
              {connected ? `Connected to ${phone}` : 'Link your WhatsApp to access MedVault from anywhere'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {connected ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 100, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <Wifi size={13} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>Connected</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={loadMessages}
                  disabled={loadingMsgs}
                  className="btn-ghost"
                >
                  <RefreshCw size={13} style={{ animation: loadingMsgs ? 'spin 1s linear infinite' : 'none' }} />
                  Refresh
                </motion.button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 100, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <WifiOff size={13} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Not connected</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {!connected ? (
        /* ── Connection form ── */
        <ConnectForm onConnected={handleConnected} />
      ) : (
        /* ── Chat display ── */
        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { icon: <CheckCircle size={14} />, label: 'Connected', value: phone || '', color: '#22c55e' },
              { icon: <MessageCircle size={14} />, label: 'Messages', value: String(messages.length), color: 'var(--dd-accent)' },
            ].map(s => (
              <div key={s.label} className="mv-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 180px' }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--dd-text-muted)', fontFamily: 'monospace' }}>{s.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat window — WhatsApp style */}
          <div
            className="mv-card"
            style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 320px)', minHeight: 400, display: 'flex', flexDirection: 'column' }}
          >
            {/* Chat header */}
            <div style={{ padding: '12px 16px', background: 'rgba(7,94,84,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>MedVault Health Assistant</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Active · {phone}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1, overflowY: 'auto', padding: '16px',
                background: 'radial-gradient(ellipse at 20% 50%, rgba(7,94,84,0.05) 0%, transparent 60%), var(--dd-bg)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              {messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 48 }}>💬</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dd-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>No messages yet</p>
                  <p style={{ fontSize: 12, color: 'var(--dd-text-muted)' }}>
                    Send a WhatsApp message to <strong>{phone}</strong> to get started.<br />
                    Try sending: <code style={{ background: 'var(--dd-surface)', padding: '2px 6px', borderRadius: 4 }}>menu</code>
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <WABubble key={msg._id || i} msg={msg} />
                  ))}
                </AnimatePresence>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Footer info */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: 'var(--dd-text-dim)', fontFamily: 'monospace' }}>
                Messages are synced from your WhatsApp conversation · Auto-refresh every 15s
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
