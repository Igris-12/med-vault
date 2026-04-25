import { useState } from 'react';
import { usePrescriptions, useInteractionGraph, usePrescriptionExtraction } from '../api/prescriptions';
import { useDocuments } from '../api/records';
import { InteractionGraph } from '../components/viz/InteractionGraph';
import PrescriptionViewer from '../components/upload/PrescriptionViewer';
import { CardSkeleton, EmptyState } from '../components/shared/Skeleton';
import type { InteractionSeverity } from '../types/api';

const SEVERITY_BADGE: Record<InteractionSeverity, string> = {
  none: 'badge-muted',
  mild: 'badge-teal',
  moderate: 'badge-amber',
  severe: 'badge-coral',
};

export default function Prescriptions() {
  const { data: prescriptions, loading: pLoading } = usePrescriptions();
  const { data: graph, loading: gLoading } = useInteractionGraph();
  const [hoveredDrugId, setHoveredDrugId] = useState<string | null>(null);

  // ── Prescription Viewer state ──────────────────────────────────────────────
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Fetch prescription-type documents to show in the viewer selector
  const { data: docsResult, loading: docsLoading } = useDocuments({ type: 'prescription', limit: 20 });
  const prescriptionDocs = docsResult?.docs ?? [];

  // Fetch extraction data for the selected document
  const { data: extractionResult, loading: extractionLoading, error: extractionError } =
    usePrescriptionExtraction(selectedDocId);

  const active = prescriptions?.filter((p) => p.status === 'active') || [];
  const discontinued = prescriptions?.filter((p) => p.status === 'discontinued') || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-sans font-bold text-2xl text-text-primary">Prescription Manager</h1>
        <p className="font-body text-sm text-text-muted mt-1">
          {active.length} active · {discontinued.length} discontinued
        </p>
      </div>

      {/* ── Prescription Viewer ─────────────────────────────────────────────── */}
      <div className="mv-card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Handwriting X-Ray Viewer</h2>
          <span className="text-[10px] font-mono text-text-faint uppercase tracking-widest">
            Hover fields → see on image
          </span>
        </div>

        {/* Document selector */}
        {docsLoading ? (
          <div className="skeleton h-9 w-full rounded-md" />
        ) : prescriptionDocs.length === 0 ? (
          <EmptyState
            message="Upload a prescription image to use the X-Ray Viewer"
            icon="🩺"
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {prescriptionDocs.map((doc) => (
              <button
                key={doc._id}
                onClick={() => setSelectedDocId(doc._id === selectedDocId ? null : doc._id)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all duration-150 ${
                  selectedDocId === doc._id
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'border-border-dim text-text-muted hover:border-text-faint hover:text-text-primary'
                }`}
              >
                {doc.filename}
              </button>
            ))}
          </div>
        )}

        {/* Viewer body */}
        {selectedDocId && (
          <>
            {extractionLoading && (
              <div className="flex flex-col gap-2">
                <div className="skeleton h-[600px] w-full rounded-md" />
              </div>
            )}

            {extractionError && !extractionLoading && (
              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-md p-4">
                <span className="text-amber-400 text-lg">⏳</span>
                <div>
                  <p className="text-sm font-mono text-amber-400">Extraction not yet available</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    This document may still be processing, or was uploaded as a PDF (image required for X-Ray view).
                  </p>
                </div>
              </div>
            )}

            {extractionResult && !extractionLoading && (
              <PrescriptionViewer
                docId={selectedDocId}
                imageUrl={extractionResult.imageUrl}
                extractionData={extractionResult.extraction}
                onConfirm={() => {
                  // Optionally show a success toast
                  console.log('Prescription confirmed and saved.');
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Drug Interaction Map */}
      <div className="mv-card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Drug Interaction Map</h2>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1"><span className="w-3 h-px bg-teal inline-block" /> Mild</span>
            <span className="flex items-center gap-1"><span className="w-3 h-px bg-amber inline-block" /> Moderate</span>
            <span className="flex items-center gap-1"><span className="w-3 h-px bg-coral inline-block" /> Severe</span>
          </div>
        </div>
        <div className="h-64 bg-card rounded-lg overflow-hidden">
          {gLoading && <div className="skeleton h-full" />}
          {!gLoading && graph && graph.nodes.length > 0 && (
            <InteractionGraph
              graph={graph}
              hoveredNodeId={hoveredDrugId}
              onNodeHover={setHoveredDrugId}
            />
          )}
          {!gLoading && (!graph || graph.nodes.length === 0) && (
            <EmptyState message="No prescriptions to map" icon="💊" />
          )}
        </div>
      </div>

      {/* Active prescriptions */}
      <div>
        <h2 className="section-title mb-4">Active Medications</h2>
        {pLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardSkeleton /><CardSkeleton />
          </div>
        )}
        {!pLoading && active.length === 0 && <EmptyState message="No active prescriptions" icon="💊" />}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map((p) => (
            <div
              key={p._id}
              onMouseEnter={() => setHoveredDrugId(p._id)}
              onMouseLeave={() => setHoveredDrugId(null)}
              className={`mv-card cursor-pointer transition-all duration-200
                ${hoveredDrugId === p._id ? 'border-teal/40 shadow-teal-glow' : ''}
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-sans font-semibold text-text-primary">{p.drugName}</p>
                  <p className="font-mono text-xs text-amber">{p.dosage} · {p.frequency}</p>
                </div>
                <span className="badge-teal">Active</span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-text-faint">
                <span>Started {new Date(p.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                <span>Dr. {p.prescribingDoctor}</span>
              </div>

              {p.interactionWarnings.length > 0 && (
                <div className={`mt-3 pt-3 border-t border-border-dim`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={SEVERITY_BADGE[p.interactionSeverity]}>
                      {p.interactionSeverity} interaction
                    </span>
                  </div>
                  <p className="font-body text-xs text-text-muted leading-relaxed">
                    {p.interactionWarnings[0]}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Discontinued */}
      {discontinued.length > 0 && (
        <div>
          <h2 className="section-title mb-4 text-text-muted">Discontinued</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {discontinued.map((p) => (
              <div key={p._id} className="mv-card opacity-60">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans font-medium text-text-muted line-through">{p.drugName}</p>
                    <p className="font-mono text-xs text-text-faint">{p.dosage}</p>
                  </div>
                  <span className="badge-muted">Stopped</span>
                </div>
                {p.endDate && (
                  <p className="font-mono text-xs text-text-faint mt-2">
                    Until {new Date(p.endDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
