import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { getAuthToken } from '../../api/base';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date }

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(localStorage.getItem('mv-support-session') || `s-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);

  useEffect(() => { localStorage.setItem('mv-support-session', sessionId.current); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  // Load existing session
  useEffect(() => {
    if (!open || msgs.length > 0) return;
    (async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${API}/api/support/session/${sessionId.current}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.messages?.length) {
            setMsgs(json.data.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
          }
        }
      } catch {}
    })();
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API}/api/support/session/${sessionId.current}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.assistantMessage) {
          setMsgs(prev => [...prev, { ...json.data.assistantMessage, timestamp: new Date() }]);
        }
      }
    } catch (err) {
      setMsgs(prev => [...prev, { role: 'assistant', content: '❌ Something went wrong. Please try again.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--dd-accent, #14b8a6), #7c3aed)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', transition: 'transform 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        title="Ask MedVault Support"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      width: 380, height: 520, borderRadius: 16, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: 'var(--dd-card, #1a1a2e)', border: '1px solid var(--dd-border, #333)',
      boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg, var(--dd-accent, #14b8a6), #7c3aed)',
        color: '#fff', flexShrink: 0,
      }}>
        <MessageCircle size={18} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>MedVault Support</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Ask anything about MedVault</div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--dd-text-dim, #888)', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            <div>Hi! I'm your MedVault assistant.</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Ask about uploads, WhatsApp, prescriptions, or any feature.</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.5,
              fontFamily: 'Inter, sans-serif', whiteSpace: 'pre-wrap',
              ...(m.role === 'user'
                ? { background: 'var(--dd-accent, #14b8a6)', color: '#fff', borderBottomRightRadius: 4 }
                : { background: 'var(--dd-surface, #252540)', color: 'var(--dd-text, #e0e0e0)', border: '1px solid var(--dd-border, #333)', borderBottomLeftRadius: 4 }
              ),
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 6, padding: '8px 12px' }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--dd-accent)' }} />
            <span style={{ fontSize: 12, color: 'var(--dd-text-dim)' }}>Thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--dd-border, #333)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask a question..."
          disabled={loading}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--dd-border, #333)',
            background: 'var(--dd-surface, #252540)', color: 'var(--dd-text, #e0e0e0)', fontSize: 13,
            fontFamily: 'Inter, sans-serif', outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: input.trim() ? 'var(--dd-accent, #14b8a6)' : 'var(--dd-surface, #252540)',
            color: '#fff', display: 'flex', alignItems: 'center', transition: 'opacity 0.15s',
            opacity: input.trim() ? 1 : 0.4,
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
