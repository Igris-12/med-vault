import type { MedDocument, DocumentType } from '../../types/api';
import { useMode } from '../../context/ModeContext';

const TYPE_LABELS: Record<DocumentType, string> = {
  lab_report: 'Lab Report',
  discharge_summary: 'Discharge',
  prescription: 'Prescription',
  imaging: 'Imaging',
  vaccination: 'Vaccination',
  consultation: 'Consultation',
  other: 'Other',
};

const TYPE_COLORS: Record<DocumentType, string> = {
  lab_report: 'badge-teal',
  discharge_summary: 'badge-coral',
  prescription: 'badge-amber',
  imaging: 'badge-muted',
  vaccination: 'badge-teal',
  consultation: 'badge-muted',
  other: 'badge-muted',
};

function criticalityColor(score: number): string {
  if (score <= 3) return 'bg-teal';
  if (score <= 6) return 'bg-amber';
  return 'bg-coral';
}

interface DocumentCardProps {
  doc: MedDocument;
  onClick?: () => void;
}

export function DocumentCard({ doc, onClick }: DocumentCardProps) {
  const { isDoctor } = useMode();
  const type = doc.documentType as DocumentType;
  const summary = isDoctor ? doc.summaryClinical : doc.summaryPlain;
  const firstSentence = summary.split('.')[0] + '.';

  const date = doc.documentDate
    ? new Date(doc.documentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date unknown';

  return (
    <div
      onClick={onClick}
      className="mv-card cursor-pointer animate-fade-in flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <span className={TYPE_COLORS[type]}>{TYPE_LABELS[type]}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`crit-dot ${criticalityColor(doc.criticalityScore)}`}
            title={`Criticality: ${doc.criticalityScore}/10`}
          />
          <span className="font-mono text-xs text-text-faint">{doc.criticalityScore}/10</span>
        </div>
      </div>

      {/* Date & Hospital */}
      <div>
        <p className="font-mono text-xs text-text-faint">{date}</p>
        {doc.sourceHospital && (
          <p className="font-body text-xs text-text-muted mt-0.5 truncate">{doc.sourceHospital}</p>
        )}
      </div>

      {/* Summary */}
      <p className="font-body text-sm text-text-muted leading-relaxed line-clamp-2">
        {firstSentence}
      </p>

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {doc.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs font-mono text-text-faint bg-surface px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
