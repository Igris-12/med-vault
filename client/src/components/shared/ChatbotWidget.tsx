// @refresh reset
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, HeartPulse } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSupportSession, postSupportMessage } from '../../api/whatsapp';

const WIDGET_SESSION_KEY = 'mv_support_session_id';

function generateSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface SupportMsg {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/* ── Chat bubble ──────────────────────────────────────────────────────────── */
function SupportBubble({ msg }: { msg: SupportMsg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs"
          style={{ background: 'var(--dd-accent-dim)', color: 'var(--dd-accent)' }}>
          <HeartPulse size={12} />
        </div>
      )}
      <div
        className="max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
        style={{
          background: isUser ? 'var(--dd-accent)' : 'var(--dd-surface)',
          color: isUser ? '#fff' : 'var(--dd-text-muted)',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          border: isUser ? 'none' : '1px solid var(--dd-border)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {/* Bold markdown renderer */}
        {msg.content.split(/\*\*(.+?)\*\*/g).map((part, i) =>
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        )}
      </div>
    </div>
  );
}

/* ── Main Widget ──────────────────────────────────────────────────────────── */
export function ChatbotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* Scroll to bottom on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Focus input when opened */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  /* Init session */
  const initSession = async () => {
    if (initialized) return;
    setInitialized(true);

    let sid = localStorage.getItem(WIDGET_SESSION_KEY);
    if (!sid) {
      sid = generateSessionId();
      localStorage.setItem(WIDGET_SESSION_KEY, sid);
    }
    setSessionId(sid);

    try {
      const session = await getSupportSession(sid);
      if (session?.messages?.length > 0) {
        setMessages(session.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })));
      } else {
        // Welcome message
        setMessages([{
          role: 'assistant',
          content: `👋 Hi${user?.displayName ? ` ${user.displayName.split(' ')[0]}` : ''}! I'm your MedVault support assistant.\n\nHow can I help you today? You can ask me about:\n• Uploading documents\n• WhatsApp connection\n• Using AI Chat\n• Emergency features`,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch {
      setMessages([{
        role: 'assistant',
        content: `👋 Hi! I'm your MedVault support assistant. How can I help you today?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    initSession();
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');

    const userMsg: SupportMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await postSupportMessage(sessionId, text);
      if (result?.assistantMessage) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.assistantMessage.content,
          timestamp: result.assistantMessage.timestamp,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Sorry, I had trouble connecting. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={handleOpen}
            style={{
              position: 'fixed',
              bottom: 28,
              right: 28,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--dd-accent), #7c3aed)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 3px rgba(255,255,255,0.08)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
            title="MedVault Support"
          >
            <MessageCircle size={22} color="#fff" />
            {/* Pulse ring */}
            <motion.span
              style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                border: '2px solid var(--dd-accent)', opacity: 0,
              }}
              animate={{ opacity: [0, 0.5, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: 28,
              right: 28,
              width: 340,
              height: 520,
              borderRadius: 20,
              background: 'var(--dd-card)',
              border: '1px solid var(--dd-border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, var(--dd-accent), #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HeartPulse size={16} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
                  MedVault Support
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>Online · Here to help</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((msg, i) => <SupportBubble key={i} msg={msg} />)}
              {loading && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--dd-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={12} style={{ color: 'var(--dd-accent)', animation: 'spin 1s linear infinite' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--dd-text-dim)',
                        animation: 'bounce 1s ease-in-out infinite',
                        animationDelay: `${i * 150}ms`,
                        display: 'inline-block',
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggested quick questions */}
            {messages.length <= 1 && (
              <div style={{ padding: '6px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--dd-border)', flexShrink: 0 }}>
                {['How do I upload?', 'Connect WhatsApp', 'Emergency card'].map(q => (
                  <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    style={{
                      fontSize: 10, padding: '4px 10px', borderRadius: 100,
                      background: 'var(--dd-surface)', border: '1px solid var(--dd-border)',
                      color: 'var(--dd-text-muted)', cursor: 'pointer',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--dd-border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type your question…"
                rows={1}
                disabled={loading}
                style={{
                  flex: 1, resize: 'none', background: 'var(--dd-surface)',
                  border: '1px solid var(--dd-border)', borderRadius: 12,
                  padding: '8px 12px', fontSize: 12, color: 'var(--dd-text)',
                  fontFamily: 'Inter, system-ui, sans-serif', outline: 'none',
                  lineHeight: 1.5,
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: input.trim() ? 'var(--dd-accent)' : 'var(--dd-border)',
                  border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.15s',
                }}
              >
                <Send size={13} color="#fff" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
