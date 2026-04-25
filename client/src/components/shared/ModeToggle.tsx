import { useMode } from '../../context/ModeContext';

export function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div className="flex items-center gap-2 bg-surface border border-border-mid rounded-full p-1">
      <button
        onClick={() => setMode('patient')}
        className={`px-4 py-1.5 rounded-full text-sm font-sans font-medium transition-all duration-200
          ${mode === 'patient'
            ? 'bg-teal text-teal-text shadow-sm'
            : 'text-text-muted hover:text-text-primary'
          }`}
      >
        Patient
      </button>
      <button
        onClick={() => setMode('doctor')}
        className={`px-4 py-1.5 rounded-full text-sm font-sans font-medium transition-all duration-200
          ${mode === 'doctor'
            ? 'bg-teal text-teal-text shadow-sm'
            : 'text-text-muted hover:text-text-primary'
          }`}
      >
        Doctor
      </button>
    </div>
  );
}
