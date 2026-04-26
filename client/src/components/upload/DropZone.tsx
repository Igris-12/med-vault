import { useCallback, useRef, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ACCEPTED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif'];

function isAccepted(file: File) {
  return (
    ACCEPTED_MIME.has(file.type) ||
    ACCEPTED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext))
  );
}

/** Recursively walk a DataTransferItem directory entry and collect all files. */
async function walkEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file(
        (f) => resolve([f]),
        () => resolve([])
      );
    });
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const allEntries: FileSystemEntry[] = [];
    await new Promise<void>((resolve) => {
      const readBatch = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) { resolve(); return; }
          allEntries.push(...batch);
          readBatch(); // keep reading until exhausted
        });
      };
      readBatch();
    });
    const nested = await Promise.all(allEntries.map(walkEntry));
    return nested.flat();
  }
  return [];
}

const MAX_SIZE_MB = 20;

export function DropZone({ onFiles, disabled }: Props) {
  const [dragging, setDragging]   = useState(false);
  const [pending,  setPending]    = useState<File[]>([]);
  const [rejected, setRejected]   = useState<string[]>([]);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    const ok: File[]     = [];
    const bad: string[]  = [];
    for (const f of incoming) {
      if (!isAccepted(f))                           { bad.push(`${f.name} (unsupported type)`); continue; }
      if (f.size > MAX_SIZE_MB * 1024 * 1024)       { bad.push(`${f.name} (> ${MAX_SIZE_MB} MB)`);  continue; }
      ok.push(f);
    }
    setPending((prev) => {
      const names = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...ok.filter((f) => !names.has(f.name + f.size))];
    });
    if (bad.length) setRejected(bad);
  }, []);

  // ── Drag & drop (supports both files and folders) ─────────────────────────
  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); if (!disabled) setDragging(true); }, [disabled]);
  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;

    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];

    for (const item of items) {
      if (item.kind !== 'file') continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        const walked = await walkEntry(entry);
        files.push(...walked);
      } else {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    addFiles(files);
  }, [disabled, addFiles]);

  // ── File picker input ─────────────────────────────────────────────────────
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  }, [addFiles]);

  // ── Folder picker input ───────────────────────────────────────────────────
  const handleFolderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  }, [addFiles]);

  const removePending = (idx: number) => setPending((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (pending.length === 0 || disabled) return;
    onFiles(pending);
    setPending([]);
    setRejected([]);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-4
          border-2 border-dashed rounded-2xl p-10 text-center
          transition-all duration-200
          ${dragging
            ? 'border-teal bg-teal/5 shadow-teal-glow scale-[1.01]'
            : 'border-border-mid hover:border-teal/50 bg-surface/50 hover:bg-surface'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXT.join(',')}
          className="sr-only"
          onChange={handleFileInput}
          disabled={disabled}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore — webkitdirectory is not in standard TS types
          webkitdirectory=""
          mozdirectory=""
          multiple
          className="sr-only"
          onChange={handleFolderInput}
          disabled={disabled}
        />

        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
          transition-all duration-200 ${dragging ? 'bg-teal/20 scale-110' : 'bg-surface'}`}>
          {dragging ? '📂' : '📄'}
        </div>

        <div>
          <p className="font-sans font-semibold text-text-primary mb-1">
            {dragging ? 'Drop files or folders here…' : 'Drop files or folders here'}
          </p>
          <p className="font-body text-sm text-text-muted">
            PDF, JPG, PNG, WebP — up to {MAX_SIZE_MB} MB each
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mv-btn-secondary text-sm flex items-center gap-2"
          >
            📄 Browse Files
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="mv-btn-secondary text-sm flex items-center gap-2"
          >
            📁 Upload Folder
          </button>
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          {['PDF', 'Lab Reports', 'Prescriptions', 'Imaging', 'Discharge Summaries'].map((t) => (
            <span key={t} className="badge-muted text-xs">{t}</span>
          ))}
        </div>
      </div>

      {/* Rejected files notice */}
      {rejected.length > 0 && (
        <div className="mv-card bg-coral/5 border-coral/20 flex flex-col gap-1">
          <p className="font-sans text-xs font-semibold text-coral">⚠️ Skipped {rejected.length} file(s)</p>
          {rejected.map((r) => (
            <p key={r} className="font-mono text-xs text-text-muted">{r}</p>
          ))}
          <button onClick={() => setRejected([])} className="text-xs text-text-faint hover:text-text-muted mt-1 text-left">Dismiss</button>
        </div>
      )}

      {/* Pending file queue */}
      {pending.length > 0 && (
        <div className="mv-card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-sans text-sm font-semibold text-text-primary">
              {pending.length} file{pending.length !== 1 ? 's' : ''} ready to upload
            </p>
            <button
              onClick={() => { setPending([]); setRejected([]); }}
              className="text-xs text-text-faint hover:text-coral transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {pending.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-card rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm flex-shrink-0">
                    {f.type === 'application/pdf' ? '📄' : '🖼️'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-text-primary truncate">{f.name}</p>
                    <p className="font-body text-xs text-text-faint">
                      {(f.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removePending(i)}
                  className="text-text-faint hover:text-coral ml-2 flex-shrink-0 text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="mv-btn-primary w-full flex items-center justify-center gap-2"
          >
            ⬆️ Upload {pending.length} file{pending.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
