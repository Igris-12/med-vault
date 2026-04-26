import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    icon: '🔬',
    title: 'AI-Powered Extraction',
    desc: 'Gemini reads any medical document — typed PDFs, scanned images, handwritten prescriptions — and extracts structured data in seconds.',
  },
  {
    icon: '📊',
    title: 'Health Intelligence',
    desc: 'Detect HbA1c trends, anomalies, and drug interactions across years of records. Your health story, visualized.',
  },
  {
    icon: '🆘',
    title: 'Emergency Ready',
    desc: 'One QR code. Blood type, allergies, and medications — accessible in any emergency, on any phone, without an app.',
  },
];

export default function Landing() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');

  useEffect(() => {
    if (user) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  async function handleGoogleSignIn() {
    setError('');
    setSigningIn(true);
    try {
      await signInWithGoogle(role);
      navigate(role === 'doctor' ? '/app/doctor/dashboard' : '/app/dashboard', { replace: true });
    } catch (err) {
      setError('Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: 'var(--dd-bg)', color: 'var(--dd-text)' }}>
      {/* ── Blue Hero Section ── */}
      <div 
        className="relative overflow-hidden shadow-xl"
        style={{ 
          background: 'var(--dd-sidebar-bg)', 
          borderBottomLeftRadius: '120px',
          paddingBottom: '80px',
          color: '#ffffff'
        }}
      >
        {/* Decorative background pattern (dots) */}
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <svg width="100" height="100" fill="none" viewBox="0 0 100 100">
            <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle fill="#ffffff" cx="2" cy="2" r="2"></circle>
            </pattern>
            <rect x="0" y="0" width="100%" height="100%" fill="url(#dots)"></rect>
          </svg>
        </div>

        {/* Nav */}
        <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white text-[var(--dd-sidebar-bg)] flex items-center justify-center font-bold text-lg shadow-sm">
              ⚕️
            </div>
            <span className="font-bold text-xl tracking-tight">MedVault</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <span className="hidden md:block opacity-80 hover:opacity-100 cursor-pointer transition">Features</span>
            <span className="hidden md:block opacity-80 hover:opacity-100 cursor-pointer transition">Security</span>
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="bg-white/10 hover:bg-white/20 border border-white/20 transition-colors px-5 py-2 rounded-lg backdrop-blur-sm disabled:opacity-60"
            >
              {signingIn ? 'Signing in...' : 'Login'}
            </button>
          </div>
        </header>

        {/* Hero Content */}
        <main className="max-w-7xl mx-auto px-8 pt-12 lg:pt-20 pb-16 flex flex-col lg:flex-row items-center gap-12 relative z-10">
          
          {/* Left Text */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 max-w-xl"
          >
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-[1.15] mb-6 tracking-tight drop-shadow-sm">
              Your health data.<br />
              Understood instantly.
            </h1>
            <p className="text-lg opacity-85 leading-relaxed mb-10 max-w-lg font-body">
              Upload any medical document. MedVault extracts, connects, and organizes your health history effortlessly.
            </p>
            
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex bg-white/10 p-1 rounded-xl w-max backdrop-blur-sm border border-white/20">
                <button
                  onClick={() => setRole('patient')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${role === 'patient' ? 'bg-white text-[var(--dd-sidebar-bg)] shadow-md' : 'text-white/80 hover:text-white'}`}
                >
                  I'm a Patient
                </button>
                <button
                  onClick={() => setRole('doctor')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${role === 'doctor' ? 'bg-white text-[var(--dd-sidebar-bg)] shadow-md' : 'text-white/80 hover:text-white'}`}
                >
                  I'm a Healthcare Provider
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="bg-white text-[var(--dd-sidebar-bg)] hover:shadow-lg hover:-translate-y-0.5 transition-all px-8 py-3.5 rounded-xl font-bold flex items-center gap-3 disabled:opacity-60"
              >
                <GoogleIcon colored /> {signingIn ? 'Please wait...' : (role === 'doctor' ? 'Provider Login' : 'Start for Free')}
              </button>
              <Link 
                to="/app/chat" 
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all px-8 py-3.5 rounded-xl font-medium backdrop-blur-sm"
              >
                Ask AI →
              </Link>
            </div>
            {error && <p className="mt-3 text-red-200 text-sm">{error}</p>}
          </motion.div>

          {/* Right Visual (Clean Pulse River Mockup) */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 w-full flex justify-end"
          >
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-6 relative">
              <div className="absolute -left-6 -top-6 w-12 h-12 bg-teal-400 rounded-full shadow-lg flex items-center justify-center text-xl z-20">✨</div>
              
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Extraction Engine</div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Lab Report — HbA1c 7.9%', width: '85%', color: 'bg-red-400', crit: 8, delay: 0 },
                  { label: 'Discharge Summary', width: '70%', color: 'bg-red-400', crit: 8, delay: 0.1 },
                  { label: 'Prescription', width: '60%', color: 'bg-amber-400', crit: 6, delay: 0.2 },
                  { label: 'Imaging — Normal', width: '30%', color: 'bg-teal-400', crit: 3, delay: 0.3 },
                ].map(({ label, width, color, crit, delay }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-400 w-4 text-right">{crit}</span>
                    <div className="flex-1 bg-slate-100 rounded-lg overflow-hidden h-10 border border-slate-200/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width }}
                        transition={{ duration: 1, delay: 0.5 + delay, ease: "easeOut" }}
                        className={`h-full ${color} opacity-90 flex items-center px-4 rounded-r-md`}
                      >
                        <span className="text-xs font-bold text-white truncate">{label}</span>
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* ── Stats Strip ── */}
      <div className="max-w-5xl mx-auto w-full px-8 -mt-10 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl shadow-[var(--dd-border)] p-6 lg:p-8 flex items-center justify-between flex-wrap gap-8">
          <div className="text-sm font-semibold text-[var(--dd-text-muted)] uppercase tracking-widest w-full text-center lg:w-auto lg:text-left">
            Powered by modern AI
          </div>
          <div className="flex-1 flex justify-around flex-wrap gap-6">
            {[
              { value: '10s', label: 'to extract' },
              { value: '768D', label: 'embeddings' },
              { value: '0', label: 'local models' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="font-bold text-2xl text-[var(--dd-sidebar-bg)]">{value}</p>
                <p className="text-xs font-medium text-[var(--dd-text-dim)] mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features Grid ── */}
      <section className="max-w-6xl mx-auto px-8 py-24 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">Collect everything in one place</h2>
          <p className="text-[var(--dd-text-muted)] max-w-2xl mx-auto">
            MedVault's intelligent engine lets you arrange and query your medical history in whatever way makes sense for your health.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map(({ icon, title, desc }, i) => (
            <motion.div 
              key={title} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(101,119,243,0.1)' }}
              className="bg-white p-8 rounded-2xl border border-[var(--dd-border)] shadow-sm transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-[#eef0fb] flex items-center justify-center text-2xl mb-6 text-[var(--dd-sidebar-bg)]">
                {icon}
              </div>
              <h3 className="font-bold text-lg mb-3">{title}</h3>
              <p className="text-[var(--dd-text-muted)] text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
      
      {/* ── Footer ── */}
      <footer className="mt-auto py-8 text-center text-sm font-medium text-[var(--dd-text-dim)] border-t border-[var(--dd-border)]">
        Built with Gemini · OpenStreetMap · MedVault 2026
      </footer>
    </div>
  );
}

function GoogleIcon({ colored = false }: { colored?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill={colored ? "#4285F4" : "currentColor"} />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill={colored ? "#34A853" : "currentColor"} />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill={colored ? "#FBBC05" : "currentColor"} />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill={colored ? "#EA4335" : "currentColor"} />
    </svg>
  );
}
