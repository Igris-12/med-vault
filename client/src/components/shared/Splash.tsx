import { useEffect, useState } from 'react';

interface SplashProps {
  onDone: () => void;
}

export function Splash({ onDone }: SplashProps) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    // Fade in → hold → fade out
    const t1 = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => setPhase('out'),  1800);
    const t3 = setTimeout(onDone,                 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void"
      style={{
        transition: 'opacity 0.6s ease',
        opacity: phase === 'out' ? 0 : 1,
        pointerEvents: 'none',
      }}
    >
      {/* Logo ring */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Spinning ring */}
        <div
          className="absolute w-24 h-24 rounded-full border-2 border-teal/30"
          style={{ animation: 'spin 2s linear infinite' }}
        />
        <div
          className="absolute w-24 h-24 rounded-full border-t-2 border-teal"
          style={{ animation: 'spin 1.2s linear infinite' }}
        />
        {/* Icon */}
        <span className="text-5xl select-none">⚕️</span>
      </div>

      {/* Brand */}
      <p className="font-sans font-bold text-3xl text-teal tracking-tight mb-2">MedVault</p>
      <p className="font-body text-sm text-text-muted">Your health records, secured.</p>

      {/* Pulse dots */}
      <div className="flex gap-2 mt-8">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-teal"
            style={{
              animation: 'pulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
