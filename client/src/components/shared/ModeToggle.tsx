import { useMode } from '../../context/ModeContext';

export function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'var(--dd-surface)', border: '1px solid var(--dd-border)',
      borderRadius: 100, padding: 4,
    }}>
      {(['patient', 'doctor'] as const).map(m => (
        <button key={m} onClick={() => setMode(m)}
          style={{
            padding: '6px 16px',
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'Inter, system-ui, sans-serif',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: mode === m
              ? `linear-gradient(135deg, var(--dd-accent), #7c3aed)`
              : 'transparent',
            color: mode === m ? '#ffffff' : 'var(--dd-text-muted)',
            boxShadow: mode === m ? '0 2px 8px var(--dd-accent-dim)' : 'none',
          }}>
          {m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  );
}
