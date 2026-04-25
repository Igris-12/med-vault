import { useState, useCallback } from 'react';
import { DropZone } from '../components/upload/DropZone';
import { ProcessingStepper } from '../components/upload/ProcessingStepper';
import { uploadFiles } from '../api/records';
import { useSocket } from '../context/SocketContext';
import type { ProcessingStep } from '../types/api';
import { toast } from 'react-hot-toast';
import { USE_MOCK_DATA } from '../mock';

interface UploadingFile {
  docId: string;
  filename: string;
  step: ProcessingStep;
}

const MOCK_STEPS: ProcessingStep[] = ['saving', 'analyzing', 'embedding', 'storing', 'done'];

export default function Upload() {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [isDone, setIsDone] = useState(false);
  const { processingDocs } = useSocket();

  const handleFiles = useCallback(async (files: File[]) => {
    setIsDone(false);
    try {
      const results = await uploadFiles(files);

      const initial: UploadingFile[] = results.map((r) => ({
        docId: r.docId,
        filename: r.filename,
        step: 'saving',
      }));
      setUploading(initial);

      if (USE_MOCK_DATA) {
        // Simulate step progression for mock mode
        for (const step of MOCK_STEPS) {
          await new Promise((r) => setTimeout(r, 700));
          setUploading((prev) => prev.map((f) => ({ ...f, step })));
        }
        setIsDone(true);
        toast.success(`${files.length} file(s) processed successfully!`);
      }
    } catch {
      toast.error('Upload failed. Please try again.');
    }
  }, []);

  // Sync with real socket events
  const mergedUploading = uploading.map((f) => {
    const socketEvent = processingDocs[f.docId];
    return socketEvent ? { ...f, step: socketEvent.step } : f;
  });

  const allDone = mergedUploading.length > 0 && mergedUploading.every((f) => f.step === 'done');

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-sans font-bold text-2xl text-text-primary">Upload Documents</h1>
        <p className="font-body text-sm text-text-muted mt-1">
          Gemini will extract all medical data automatically
        </p>
      </div>

      {/* Drop zone */}
      <DropZone onFiles={handleFiles} disabled={uploading.length > 0 && !allDone} />

      {/* Processing steppers */}
      {mergedUploading.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="section-title">
            {allDone || isDone ? '✅ Processing Complete' : '⏳ Processing…'}
          </h2>
          {mergedUploading.map((f) => (
            <ProcessingStepper key={f.docId} currentStep={f.step} filename={f.filename} />
          ))}
        </div>
      )}

      {/* Tips */}
      {uploading.length === 0 && (
        <div className="mv-card bg-surface/50">
          <h3 className="font-sans font-semibold text-sm text-text-primary mb-3">What gets extracted</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🧪', label: 'Lab values & trends' },
              { icon: '💊', label: 'Medications & dosages' },
              { icon: '🏥', label: 'Hospital & doctor info' },
              { icon: '🔍', label: 'Key findings & summary' },
              { icon: '📊', label: 'Criticality score (1–10)' },
              { icon: '🏷️', label: 'Smart semantic tags' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <span className="font-body text-sm text-text-muted">{label}</span>
              </div>
            ))}
          </div>
          <p className="font-body text-xs text-text-faint mt-4">
            Works with handwritten prescriptions, scanned images, and typed PDFs.
          </p>
        </div>
      )}
    </div>
  );
}
