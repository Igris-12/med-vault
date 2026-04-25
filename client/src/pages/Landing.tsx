import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

  // If already signed in, go straight to app
  if (user) {
    navigate('/app/dashboard', { replace: true });
    return null;
  }

  async function handleGoogleSignIn() {
    setError('');
    setSigningIn(true);
    try {
      await signInWithGoogle();
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError('Sign-in failed. Please try again.');
      console.error(err);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="min-h-screen bg-void text-text-primary flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border-dim">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚕️</span>
          <span className="font-sans font-bold text-xl text-teal">MedVault</span>
        </div>

        <button
          id="landing-google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {signingIn ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Signing in…
            </>
          ) : (
            <>
              <GoogleIcon />
              Sign in with Google
            </>
          )}
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Left — Copy */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-16 max-w-2xl">
          <span className="badge-teal w-fit mb-6">Powered by Gemini 1.5 Flash</span>

          <h1 className="font-sans font-bold text-5xl lg:text-6xl leading-tight mb-6">
            Your medical records,{' '}
            <span className="text-gradient-teal">understood in</span>{' '}
            <span className="relative inline-block">
              seconds
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-teal" />
            </span>
            .
          </h1>

          <p className="font-body text-lg text-text-muted leading-relaxed mb-8 max-w-lg">
            Upload any medical document. MedVault extracts, understands, and connects your health data
            across time — and answers your questions in plain language.
          </p>

          {/* CTA */}
          <div className="flex gap-4 flex-wrap items-center">
            <button
              id="hero-google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {signingIn ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <GoogleIcon />
              )}
              Get started free
            </button>
            <Link to="/app/chat" className="btn-ghost">
              Try AI chat →
            </Link>
          </div>

          {error && (
            <p className="mt-3 text-coral text-sm font-body">{error}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mt-12 pt-8 border-t border-border-dim">
            {[
              { value: '10s', label: 'to extract any document' },
              { value: '768D', label: 'semantic embeddings' },
              { value: '0', label: 'local models needed' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="font-mono font-bold text-2xl text-teal">{value}</p>
                <p className="font-body text-xs text-text-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Animated health pulse */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-16 relative overflow-hidden">
          <div className="w-full max-w-md space-y-2">
            {[
              { label: 'Lab Report — HbA1c 7.9%', width: '85%', color: 'bg-coral', crit: 8, delay: '0ms' },
              { label: 'Discharge Summary', width: '70%', color: 'bg-coral', crit: 8, delay: '100ms' },
              { label: 'Lab Report — HbA1c 7.4%', width: '60%', color: 'bg-amber', crit: 6, delay: '200ms' },
              { label: 'Lab Report — HbA1c 7.1%', width: '50%', color: 'bg-amber', crit: 5, delay: '300ms' },
              { label: 'Prescription', width: '30%', color: 'bg-teal', crit: 3, delay: '400ms' },
              { label: 'Imaging — Normal', width: '20%', color: 'bg-teal', crit: 1, delay: '500ms' },
              { label: 'Vaccination', width: '18%', color: 'bg-teal', crit: 1, delay: '600ms' },
              { label: 'Lab Report — HbA1c 6.8%', width: '45%', color: 'bg-teal', crit: 4, delay: '700ms' },
            ].map(({ label, width, color, crit, delay }) => (
              <div
                key={label}
                className="flex items-center gap-3 animate-slide-in-up"
                style={{ animationDelay: delay }}
              >
                <span className="font-mono text-xs text-text-faint w-5 text-right flex-shrink-0">{crit}</span>
                <div className="flex-1 bg-surface rounded overflow-hidden h-8">
                  <div
                    className={`h-full ${color} opacity-80 rounded transition-all duration-700 flex items-center px-3`}
                    style={{ width }}
                  >
                    <span className="text-xs font-mono text-black/70 truncate">{label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Glow overlay */}
          <div className="absolute inset-0 bg-gradient-to-l from-void via-transparent to-transparent pointer-events-none" />
        </div>
      </main>

      {/* Features */}
      <section className="px-8 lg:px-16 py-16 border-t border-border-dim">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="mv-card">
              <span className="text-3xl mb-4 block">{icon}</span>
              <h3 className="font-sans font-semibold text-text-primary mb-2">{title}</h3>
              <p className="font-body text-sm text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <button
            id="bottom-google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base disabled:opacity-60"
          >
            <GoogleIcon />
            Sign in with Google — it's free
          </button>
          <p className="font-body text-xs text-text-faint mt-3">
            No credit card · No app download · Your data stays yours
          </p>
        </div>
      </section>
    </div>
  );
}

// Inline Google "G" icon so there's no extra dependency
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
