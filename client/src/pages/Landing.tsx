import { Link } from 'react-router-dom';

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
  return (
    <div className="min-h-screen bg-void text-text-primary flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border-dim">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚕️</span>
          <span className="font-sans font-bold text-xl text-teal">MedVault</span>
        </div>
        <Link to="/app/dashboard" className="btn-primary text-sm">
          Open Dashboard →
        </Link>
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

          <div className="flex gap-4 flex-wrap">
            <Link to="/app/dashboard" className="btn-primary">
              Start for free
            </Link>
            <Link to="/app/chat" className="btn-ghost">
              Ask AI about your records →
            </Link>
          </div>

          {/* Social proof */}
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

        {/* Right — Animated pulse river */}
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
      </section>
    </div>
  );
}
