import { useCallback, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function DropZone({ onFiles, disabled }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter((f) => ACCEPTED.includes(f.type));
      if (files.length) onFiles(files);
    },
    [onFiles, disabled]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter((f) => ACCEPTED.includes(f.type));
      if (files.length) onFiles(files);
      e.target.value = '';
    },
    [onFiles]
  );

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center gap-4
        border-2 border-dashed rounded-2xl p-12 cursor-pointer
        transition-all duration-200 text-center
        ${dragging
          ? 'border-teal bg-teal/5 shadow-teal-glow'
          : 'border-border-mid hover:border-teal/50 bg-surface/50 hover:bg-surface'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        multiple
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleInput}
        disabled={disabled}
      />

      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
        transition-all duration-200 ${dragging ? 'bg-teal/20 scale-110' : 'bg-surface'}`}>
        📄
      </div>

      <div>
        <p className="font-sans font-semibold text-text-primary mb-1">
          {dragging ? 'Drop to upload' : 'Drop files here or click to browse'}
        </p>
        <p className="font-body text-sm text-text-muted">
          Supports PDF, JPG, PNG, WebP — up to 20MB each
        </p>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        {['Lab Reports', 'Prescriptions', 'Discharge Summaries', 'Imaging'].map((t) => (
          <span key={t} className="badge-muted">{t}</span>
        ))}
      </div>
    </label>
  );
}
