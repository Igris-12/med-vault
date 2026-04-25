import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { MessageCircle, Bell, ArrowRight, CheckCheck, Zap, Shield, Sparkles } from 'lucide-react';
import { FLOATING_REMINDERS } from '../../mock/mockReminders';

/* ─── Animated Mesh Background ────────────────────────────────────────── */
function MeshBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(120,40,200,0.35) 0%, transparent 70%), #050714' }} />
      {/* Orb 1 — purple */}
      <motion.div
        className="absolute rounded-full blur-[120px] opacity-40"
        style={{ width: 600, height: 600, top: '-10%', left: '-10%', background: 'radial-gradient(circle, #7c3aed, #4f46e5)' }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Orb 2 — pink/magenta */}
      <motion.div
        className="absolute rounded-full blur-[140px] opacity-30"
        style={{ width: 500, height: 500, top: '30%', right: '-15%', background: 'radial-gradient(circle, #ec4899, #a855f7)' }}
        animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      {/* Orb 3 — green (WhatsApp) */}
      <motion.div
        className="absolute rounded-full blur-[160px] opacity-20"
        style={{ width: 400, height: 400, bottom: '5%', left: '30%', background: 'radial-gradient(circle, #22c55e, #16a34a)' }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

/* ─── Custom Cursor ────────────────────────────────────────────────────── */
function PremiumCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { stiffness: 500, damping: 40 });
  const springY = useSpring(cursorY, { stiffness: 500, damping: 40 });
  const trailX = useSpring(cursorX, { stiffness: 120, damping: 28 });
  const trailY = useSpring(cursorY, { stiffness: 120, damping: 28 });
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    if (window.innerWidth < 768) return;
    const move = (e: MouseEvent) => { cursorX.set(e.clientX); cursorY.set(e.clientY); };
    const click = (e: MouseEvent) => {
      const id = Date.now();
      setRipples(p => [...p, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setRipples(p => p.filter(r => r.id !== id)), 700);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('click', click);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('click', click); };
  }, []);

  if (typeof window !== 'undefined' && window.innerWidth < 768) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {/* Trail ring */}
      <motion.div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-400/40"
        style={{ left: trailX, top: trailY, width: 40, height: 40 }} />
      {/* Sharp dot */}
      <motion.div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: springX, top: springY, width: 10, height: 10, background: '#a855f7', boxShadow: '0 0 16px #a855f7, 0 0 32px rgba(168,85,247,0.4)' }} />
      {/* Ripples */}
      {ripples.map(r => (
        <motion.div key={r.id} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-400"
          style={{ left: r.x, top: r.y }}
          initial={{ width: 0, height: 0, opacity: 0.8 }}
          animate={{ width: 80, height: 80, opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ─── Floating Reminder Pill ───────────────────────────────────────────── */
function FloatingPill({ icon, label, color, delay, style }: {
  icon: string; label: string; color: string; delay: number;
  style: React.CSSProperties;
}) {
  return (
    <motion.div
      className="absolute hidden lg:flex items-center gap-2 px-4 py-2 rounded-full z-20"
      style={{
        ...style,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)`,
      }}
      initial={{ opacity: 0, scale: 0.8, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
      transition={{
        opacity: { delay: delay + 1, duration: 0.5 },
        scale: { delay: delay + 1, duration: 0.4, type: 'spring' },
        y: { delay: delay + 1.4, duration: 4, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      <span className="text-base">{icon}</span>
      <span className="text-sm font-medium text-white/80">{label}</span>
      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
    </motion.div>
  );
}

/* ─── Hero WA Preview Card ─────────────────────────────────────────────── */
function HeroPreviewCard() {
  const messages = [
    { from: 'bot', text: '⏰ Reminder: Team standup at 9:30 AM!', time: '9:15 AM', status: 'delivered' },
    { from: 'bot', text: '💊 Time to take your medication 💊', time: '8:00 AM', status: 'delivered' },
    { from: 'bot', text: '🏋️ Gym session starts in 15 minutes!', time: '5:45 AM', status: 'sent' },
  ];

  return (
    <motion.div
      className="relative w-full max-w-sm mx-auto"
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.6, duration: 0.8, type: 'spring', stiffness: 100 }}
      style={{ perspective: 1000 }}
    >
      {/* Glow behind card */}
      <div className="absolute inset-0 blur-2xl opacity-40 rounded-3xl -z-10"
        style={{ background: 'linear-gradient(135deg, #7c3aed40, #22c55e40)' }} />

      <div className="rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}>
        {/* Phone header */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(7,94,84,0.9)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>🤖</div>
          <div>
            <p className="text-sm font-semibold text-white">Smart Reminder Bot</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <p className="text-xs text-green-300">online</p>
            </div>
          </div>
        </div>
        {/* Messages */}
        <div className="p-4 space-y-3" style={{ background: 'rgba(5,7,20,0.85)', minHeight: 160 }}>
          {messages.map((msg, i) => (
            <motion.div key={i} className="flex gap-2 items-end"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + i * 0.4, duration: 0.4 }}>
              <div className="max-w-xs rounded-2xl rounded-bl-sm px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm text-white/90">{msg.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-xs text-white/30" style={{ fontSize: 10 }}>{msg.time}</span>
                  <CheckCheck size={11} color={msg.status === 'delivered' ? '#22c55e' : '#94a3b8'} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Landing Page ─────────────────────────────────────────────────────── */
export default function WALanding() {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={heroRef} className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#050714', cursor: 'none' }}>
      <PremiumCursor />
      <MeshBackground />

      {/* ── Nav ── */}
      <motion.header className="relative z-30 flex items-center justify-between px-6 lg:px-16 py-5"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #22c55e)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}>
            <MessageCircle size={18} color="#fff" />
          </div>
          <span className="font-bold text-xl text-white">Remind<span style={{ color: '#22c55e' }}>WA</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {['Features', 'Dashboard', 'Activity'].map(item => (
            <a key={item} href="#" className="text-sm text-white/50 hover:text-white transition-colors">{item}</a>
          ))}
        </nav>
        <Link to="/app/reminders/schedule" data-cursor="button">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 20px rgba(124,58,237,0.4)', cursor: 'none' }}>
            Get Started <ArrowRight size={15} />
          </motion.button>
        </Link>
      </motion.header>

      {/* ── Hero ── */}
      <main className="relative z-20 flex-1 flex flex-col lg:flex-row items-center gap-12 px-6 lg:px-16 py-12 lg:py-20 max-w-7xl mx-auto w-full">
        {/* Left: Copy */}
        <div className="flex-1 flex flex-col items-start">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <Sparkles size={13} color="#a855f7" />
            <span className="text-xs font-mono text-purple-300">AI-Powered WhatsApp Reminders</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 className="font-bold leading-[1.1] mb-6"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', color: '#fff' }}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}>
            Never Miss{' '}
            <span style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              What Matters
            </span>
          </motion.h1>

          <motion.p className="text-lg leading-relaxed mb-10 max-w-lg" style={{ color: 'rgba(255,255,255,0.5)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
            Smart WhatsApp reminders that keep you on track — delivered instantly to the app 2 billion people already use.
          </motion.p>

          {/* CTAs */}
          <motion.div className="flex flex-wrap gap-4 mb-14"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <Link to="/app/reminders/schedule" data-cursor="button">
              <motion.button whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(34,197,94,0.5)' }} whileTap={{ scale: 0.97 }}
                className="relative flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base text-white overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 30px rgba(34,197,94,0.35)', cursor: 'none' }}>
                {/* Shine */}
                <motion.div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
                  animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }} />
                <Bell size={18} />
                Set Your First Reminder
              </motion.button>
            </Link>
            <Link to="/app/reminders/dashboard" data-cursor="button">
              <motion.button whileHover={{ scale: 1.03, borderColor: 'rgba(168,85,247,0.5)', color: '#c084fc' }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-7 py-4 rounded-2xl font-semibold text-base transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'none' }}>
                View Dashboard <ArrowRight size={16} />
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div className="flex items-center gap-8 flex-wrap"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            {[
              { icon: <Zap size={14} />, value: '< 1s', label: 'Delivery', color: '#f59e0b' },
              { icon: <CheckCheck size={14} />, value: '99.2%', label: 'Success rate', color: '#22c55e' },
              { icon: <Shield size={14} />, value: '10K+', label: 'Reminders sent', color: '#a855f7' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18`, border: `1px solid ${s.color}30`, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <p className="font-mono font-bold text-sm text-white">{s.value}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Preview Card + Floating Pills */}
        <div className="relative flex-1 flex items-center justify-center w-full min-h-[420px]">
          <HeroPreviewCard />
          {FLOATING_REMINDERS.map((r, i) => {
            const positions = [
              { top: '5%', left: '-8%' },
              { bottom: '10%', left: '-12%' },
              { top: '8%', right: '-8%' },
              { bottom: '12%', right: '-10%' },
            ];
            return <FloatingPill key={r.label} {...r} style={positions[i] ?? { top: '50%', left: '0' }} />;
          })}
        </div>
      </main>

      {/* ── Feature strip ── */}
      <motion.section className="relative z-20 px-6 lg:px-16 py-12 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: '⚡', title: 'Instant Delivery', desc: 'Messages reach WhatsApp in under 1 second via our optimized gateway.', color: '#f59e0b' },
            { icon: '🔁', title: 'Smart Scheduling', desc: 'Set once, daily, weekly — fully automated with time-zone awareness.', color: '#22c55e' },
            { icon: '📊', title: 'Real-Time Tracking', desc: 'Know exactly when each reminder was sent, delivered, and read.', color: '#a855f7' },
          ].map((f, i) => (
            <motion.div key={f.title} data-cursor="card"
              whileHover={{ y: -6, borderColor: `${f.color}40` }}
              className="rounded-2xl p-6 transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: `${f.color}12`, border: `1px solid ${f.color}25` }}>{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
