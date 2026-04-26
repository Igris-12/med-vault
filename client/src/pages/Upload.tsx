import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropZone } from '../components/upload/DropZone';
import { ProcessingStepper } from '../components/upload/ProcessingStepper';
import { uploadFiles } from '../api/records';
import { useSocket } from '../context/SocketContext';
import type { ProcessingStep, MedDocument } from '../types/api';
import { toast } from 'react-hot-toast';
import { USE_MOCK_DATA } from '../mock';

interface UploadingFile {
  docId: string;
  filename: string;
  step: ProcessingStep;
  result?: Partial<MedDocument>;
}

const MOCK_STEPS: ProcessingStep[] = ['saving', 'analyzing', 'embedding', 'storing', 'done'];

export default function Upload() {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [isDone, setIsDone] = useState(false);
  const { processingDocs } = useSocket();
  const navigate = useNavigate();

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

  // Sync with real socket events — capture document data when done
  const mergedUploading = uploading.map((f) => {
    const socketEvent = processingDocs[f.docId];
    if (socketEvent) {
      return {
        ...f,
        step: socketEvent.step,
        result: socketEvent.status === 'done' && socketEvent.data ? socketEvent.data : f.result,
      };
    }
    return f;
  });

  const allDone = mergedUploading.length > 0 && mergedUploading.every((f) => f.step === 'done');

  const handleUploadMore = () => {
    setUploading([]);
    setIsDone(false);
  };

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

      {/* ── Extraction Results ───────────────────────────────────────────────── */}
      {allDone && mergedUploading.some((f) => f.result) && (
        <div className="flex flex-col gap-4">
          <h2 className="section-title">📋 Extraction Results</h2>
          {mergedUploading.map((f) => {
            const doc = f.result;
            if (!doc) return null;
            const isPrescription = doc.documentType === 'prescription';

            return (
              <div key={f.docId} className="mv-card flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="badge-muted text-xs capitalize">
                      {(doc.documentType || 'other').replace('_', ' ')}
                    </span>
                    <span className="font-mono text-sm text-text-primary truncate">{f.filename}</span>
                  </div>
                  {doc.criticalityScore != null && (
                    <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                      doc.criticalityScore >= 7 ? 'bg-coral/15 text-coral' :
                      doc.criticalityScore >= 4 ? 'bg-amber/15 text-amber' :
                      'bg-teal/15 text-teal'
                    }`}>
                      ● {doc.criticalityScore}/10
                    </span>
                  )}
                </div>

                {/* Summary */}
                {doc.summaryPlain && (
                  <div className="bg-card rounded-lg p-3">
                    <p className="font-sans text-xs font-semibold text-text-faint uppercase tracking-wider mb-1.5">
                      Summary
                    </p>
                    <p className="font-body text-sm text-text-muted leading-relaxed">
                      {doc.summaryPlain}
                    </p>
                  </div>
                )}

                {/* Key Findings */}
                {doc.keyFindings && doc.keyFindings.length > 0 && (
                  <div>
                    <p className="font-sans text-xs font-semibold text-text-faint uppercase tracking-wider mb-2">
                      Key Findings
                    </p>
                    {doc.keyFindings.map((finding, i) => (
                      <div key={i} className="flex gap-2 mb-1.5">
                        <span className="text-teal flex-shrink-0">→</span>
                        <p className="font-body text-sm text-text-muted">{finding}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick stats row */}
                <div className="flex flex-wrap gap-3">
                  {doc.labValues && doc.labValues.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-card rounded-md px-2.5 py-1.5">
                      <span className="text-sm">🧪</span>
                      <span className="font-mono text-xs text-text-muted">
                        {doc.labValues.length} lab value{doc.labValues.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {doc.medications && doc.medications.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-card rounded-md px-2.5 py-1.5">
                      <span className="text-sm">💊</span>
                      <span className="font-mono text-xs text-text-muted">
                        {doc.medications.length} medication{doc.medications.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {doc.conditionsMentioned && doc.conditionsMentioned.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-card rounded-md px-2.5 py-1.5">
                      <span className="text-sm">🏥</span>
                      <span className="font-mono text-xs text-text-muted">
                        {doc.conditionsMentioned.length} condition{doc.conditionsMentioned.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {doc.sourceHospital && (
                    <div className="flex items-center gap-1.5 bg-card rounded-md px-2.5 py-1.5">
                      <span className="text-sm">🏥</span>
                      <span className="font-mono text-xs text-text-muted">{doc.sourceHospital}</span>
                    </div>
                  )}
                  {doc.doctorName && (
                    <div className="flex items-center gap-1.5 bg-card rounded-md px-2.5 py-1.5">
                      <span className="text-sm">👨‍⚕️</span>
                      <span className="font-mono text-xs text-text-muted">Dr. {doc.doctorName}</span>
                    </div>
                  )}
                </div>

                {/* Medications list (for prescriptions) */}
                {isPrescription && doc.medications && doc.medications.length > 0 && (
                  <div>
                    <p className="font-sans text-xs font-semibold text-text-faint uppercase tracking-wider mb-2">
                      Medications Extracted
                    </p>
                    <div className="space-y-1.5">
                      {doc.medications.map((m, i) => (
                        <div key={i} className="bg-card rounded-lg px-3 py-2 flex items-center justify-between">
                          <div>
                            <p className="font-mono text-sm text-text-primary">
                              {m.name} <span className="text-amber">{m.dosage}</span>
                            </p>
                            <p className="font-body text-xs text-text-muted">{m.frequency}</p>
                          </div>
                          <span className="font-mono text-xs text-text-faint">{m.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {doc.tags.map((tag) => (
                      <span key={tag} className="badge-muted text-xs">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => navigate('/app/records')}
              className="mv-btn-primary flex items-center gap-2"
            >
              📂 View in Records
            </button>
            {mergedUploading.some((f) => f.result?.documentType === 'prescription') && (
              <button
                onClick={() => navigate('/app/prescriptions')}
                className="mv-btn-secondary flex items-center gap-2"
              >
                💊 View Prescriptions
              </button>
            )}
            <button
              onClick={handleUploadMore}
              className="mv-btn-secondary flex items-center gap-2"
            >
              ＋ Upload More
            </button>
          </div>
        </div>
      )}

      {/* All done but no result data (socket didn't include it) */}
      {allDone && !mergedUploading.some((f) => f.result) && (
        <div className="flex flex-col gap-3">
          <div className="mv-card bg-teal/5 border-teal/20">
            <p className="font-body text-sm text-text-muted">
              ✅ Document processed! View the extracted data in your Document Library.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/app/records')} className="mv-btn-primary">
              📂 View in Records
            </button>
            <button onClick={handleUploadMore} className="mv-btn-secondary">
              ＋ Upload More
            </button>
          </div>
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
