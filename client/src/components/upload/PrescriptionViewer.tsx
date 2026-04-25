import { useState, useCallback } from 'react';
import type { PrescriptionExtraction, FieldExtraction, MedicationExtraction } from '../../types/api';
import { confirmExtraction } from '../../api/prescriptions';
import { getAuthToken } from '../../api/base';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  docId: string;
  imageUrl: string;
  extractionData: PrescriptionExtraction;
  onConfirm?: () => void;
}

type FieldKey = string; // e.g. "patient_name", "medications.0.dosage"

// ─── Helper: convert bbox [ymin,xmin,ymax,xmax] → CSS % strings ──────────────
function bboxToStyle(bbox: [number, number, number, number]) {
  const [ymin, xmin, ymax, xmax] = bbox;
  return {
    top: `${ymin * 100}%`,
    left: `${xmin * 100}%`,
    width: `${(xmax - xmin) * 100}%`,
    height: `${(ymax - ymin) * 100}%`,
  };
}

// ─── Helper: confidence badge variant ────────────────────────────────────────
function getConfidenceVariant(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 90) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
}

const BADGE_STYLES = {
  green: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  yellow: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  red: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

// ─── Confidence Badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ field }: { field: FieldExtraction }) {
  const variant = getConfidenceVariant(field.confidence_score);
  return (
    <span
      className={`relative group inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono cursor-default ${BADGE_STYLES[variant]}`}
    >
      {field.confidence_score}%
      {/* Tooltip */}
      <span className="pointer-events-none absolute bottom-full left-0 mb-1 w-max max-w-xs bg-[#1a1d27] border border-[#2a2d3a] text-[#a0a3b1] text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal">
        {field.confidence_reason}
      </span>
    </span>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  fieldKey: FieldKey;
  field: FieldExtraction;
  isHovered: boolean;
  correction?: string;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onCorrection: (val: string) => void;
}

function FieldRow({
  label,
  fieldKey,
  field,
  isHovered,
  correction,
  onHoverEnter,
  onHoverLeave,
  onCorrection,
}: FieldRowProps) {
  const isRed = field.confidence_score > 0 && field.confidence_score < 70;
  const displayValue = field.value ?? '—';

  return (
    <div
      className={`flex flex-col gap-1 p-2 rounded-md transition-colors duration-150 cursor-default ${
        isHovered ? 'bg-cyan-500/10 border border-cyan-500/30' : 'border border-transparent'
      }`}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      data-field-key={fieldKey}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-[#5a5d6e] uppercase tracking-wide">{label}</span>
        {field.confidence_score > 0 && <ConfidenceBadge field={field} />}
      </div>
      <span
        className={`text-sm font-mono ${
          field.value === 'ILLEGIBLE'
            ? 'text-red-400 italic'
            : field.value
            ? 'text-[#e2e5f1]'
            : 'text-[#3a3d4e] italic'
        }`}
      >
        {displayValue}
      </span>
      {/* Manual correction input for low-confidence fields */}
      {isRed && (
        <input
          type="text"
          value={correction ?? ''}
          onChange={(e) => onCorrection(e.target.value)}
          placeholder="Cannot read clearly — type what you see"
          className="mt-1 w-full bg-[#0d0f18] border border-red-500/40 rounded px-2 py-1.5 text-xs font-mono text-[#e2e5f1] placeholder-[#3a3d4e] focus:outline-none focus:border-cyan-500/50 transition-colors"
        />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PrescriptionViewer({ docId, imageUrl, extractionData, onConfirm }: Props) {
  const [hoveredField, setHoveredField] = useState<FieldKey | null>(null);
  const [manualCorrections, setManualCorrections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!extractionData.confirmedAt);

  // Build the authenticated image src using the token
  const authToken = getAuthToken();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const authenticatedImageUrl = `${API_BASE}${imageUrl}`;

  // Collect all red fields that need a correction
  const redFields: FieldKey[] = [];
  const collectRedFields = (field: FieldExtraction, key: FieldKey) => {
    if (field.confidence_score > 0 && field.confidence_score < 70) redFields.push(key);
  };
  collectRedFields(extractionData.patient_name, 'patient_name');
  collectRedFields(extractionData.doctor_name, 'doctor_name');
  collectRedFields(extractionData.date, 'date');
  collectRedFields(extractionData.diagnosis, 'diagnosis');
  extractionData.medications.forEach((med, i) => {
    collectRedFields(med.medication_name, `medications.${i}.medication_name`);
    collectRedFields(med.dosage, `medications.${i}.dosage`);
    collectRedFields(med.frequency, `medications.${i}.frequency`);
    collectRedFields(med.duration, `medications.${i}.duration`);
    collectRedFields(med.instructions, `medications.${i}.instructions`);
  });

  const allRedFilled = redFields.every((k) => (manualCorrections[k] ?? '').trim().length > 0);
  const canSave = allRedFilled && !saving && !saved;

  const handleCorrection = useCallback((key: FieldKey, val: string) => {
    setManualCorrections((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleConfirm = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await confirmExtraction(docId, manualCorrections);
      setSaved(true);
      onConfirm?.();
    } catch (err) {
      console.error('Failed to confirm extraction:', err);
    } finally {
      setSaving(false);
    }
  };

  // Build overlay entries: each active bbox overlay
  type OverlayEntry = { key: FieldKey; bbox: [number, number, number, number] };
  const overlays: OverlayEntry[] = [];
  const maybeOverlay = (field: FieldExtraction, key: FieldKey) => {
    if (field.bounding_box?.length === 4) overlays.push({ key, bbox: field.bounding_box as [number, number, number, number] });
  };
  maybeOverlay(extractionData.patient_name, 'patient_name');
  maybeOverlay(extractionData.doctor_name, 'doctor_name');
  maybeOverlay(extractionData.date, 'date');
  maybeOverlay(extractionData.diagnosis, 'diagnosis');
  extractionData.medications.forEach((med, i) => {
    maybeOverlay(med.medication_name, `medications.${i}.medication_name`);
    maybeOverlay(med.dosage, `medications.${i}.dosage`);
    maybeOverlay(med.frequency, `medications.${i}.frequency`);
    maybeOverlay(med.duration, `medications.${i}.duration`);
    maybeOverlay(med.instructions, `medications.${i}.instructions`);
  });

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0 bg-[#0f1117] border border-[#1e2130] rounded-md overflow-hidden">
      {/* ── Two-column split ── */}
      <div className="flex flex-col lg:flex-row h-[600px]">
        {/* ── Left: Image panel ── */}
        <div className="relative flex-1 lg:max-w-[55%] bg-[#080a10] overflow-hidden select-none">
          <img
            src={`${authenticatedImageUrl}?token=${authToken}`}
            alt="Prescription"
            className="w-full h-full object-contain"
            draggable={false}
          />
          {/* Bounding box overlays */}
          {overlays.map(({ key, bbox }) => {
            const isActive = hoveredField === key;
            return (
              <div
                key={key}
                className="absolute pointer-events-none transition-all duration-150 rounded-sm"
                style={{
                  ...bboxToStyle(bbox),
                  border: '2px solid',
                  borderColor: isActive ? 'cyan' : 'transparent',
                  opacity: isActive ? 1 : 0,
                  boxShadow: isActive ? '0 0 8px 2px rgba(0,255,255,0.45)' : 'none',
                }}
              />
            );
          })}
          {/* Dim overlay hint */}
          <div className="absolute bottom-2 left-2 text-[10px] font-mono text-[#2a2d3a] pointer-events-none">
            Hover a field → see location
          </div>
        </div>

        {/* ── Right: Fields panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden border-l border-[#1e2130]">
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {/* Patient Info */}
            <div>
              <p className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest mb-2">Patient Info</p>
              <div className="flex flex-col gap-1">
                <FieldRow
                  label="Patient Name"
                  fieldKey="patient_name"
                  field={extractionData.patient_name}
                  isHovered={hoveredField === 'patient_name'}
                  correction={manualCorrections['patient_name']}
                  onHoverEnter={() => setHoveredField('patient_name')}
                  onHoverLeave={() => setHoveredField(null)}
                  onCorrection={(v) => handleCorrection('patient_name', v)}
                />
                <FieldRow
                  label="Doctor"
                  fieldKey="doctor_name"
                  field={extractionData.doctor_name}
                  isHovered={hoveredField === 'doctor_name'}
                  correction={manualCorrections['doctor_name']}
                  onHoverEnter={() => setHoveredField('doctor_name')}
                  onHoverLeave={() => setHoveredField(null)}
                  onCorrection={(v) => handleCorrection('doctor_name', v)}
                />
                <FieldRow
                  label="Date"
                  fieldKey="date"
                  field={extractionData.date}
                  isHovered={hoveredField === 'date'}
                  correction={manualCorrections['date']}
                  onHoverEnter={() => setHoveredField('date')}
                  onHoverLeave={() => setHoveredField(null)}
                  onCorrection={(v) => handleCorrection('date', v)}
                />
              </div>
            </div>

            {/* Medications */}
            {extractionData.medications.map((med, i) => (
              <MedicationCard
                key={i}
                index={i}
                med={med}
                hoveredField={hoveredField}
                corrections={manualCorrections}
                onHoverEnter={(k) => setHoveredField(k)}
                onHoverLeave={() => setHoveredField(null)}
                onCorrection={handleCorrection}
              />
            ))}

            {/* Diagnosis */}
            <div>
              <p className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest mb-2">Diagnosis</p>
              <FieldRow
                label="Diagnosis"
                fieldKey="diagnosis"
                field={extractionData.diagnosis}
                isHovered={hoveredField === 'diagnosis'}
                correction={manualCorrections['diagnosis']}
                onHoverEnter={() => setHoveredField('diagnosis')}
                onHoverLeave={() => setHoveredField(null)}
                onCorrection={(v) => handleCorrection('diagnosis', v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-[#1e2130] bg-[#0b0d16] px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Legibility progress bar */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#5a5d6e] uppercase tracking-wide">
              Overall Prescription Legibility
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {extractionData.overall_legibility}%
            </span>
          </div>
          <div className="h-1.5 bg-[#1a1d27] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${extractionData.overall_legibility}%`,
                background:
                  extractionData.overall_legibility >= 80
                    ? 'linear-gradient(90deg, #06b6d4, #22d3ee)'
                    : extractionData.overall_legibility >= 60
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #ef4444, #f87171)',
              }}
            />
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!canSave}
          className={`flex-shrink-0 px-5 py-2 rounded-md text-sm font-mono font-medium transition-all duration-200 ${
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
              : canSave
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400/60 active:scale-95'
              : 'bg-[#1a1d27] text-[#3a3d4e] border border-[#2a2d3a] cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving…' : saved ? '✓ Confirmed' : redFields.length > 0 ? `Fix ${redFields.length - Object.keys(manualCorrections).filter(k => manualCorrections[k]?.trim()).length} field(s) to save` : 'Confirm & Save'}
        </button>
      </div>
    </div>
  );
}

// ─── Medication Card ──────────────────────────────────────────────────────────

function MedicationCard({
  index,
  med,
  hoveredField,
  corrections,
  onHoverEnter,
  onHoverLeave,
  onCorrection,
}: {
  index: number;
  med: MedicationExtraction;
  hoveredField: FieldKey | null;
  corrections: Record<string, string>;
  onHoverEnter: (k: FieldKey) => void;
  onHoverLeave: () => void;
  onCorrection: (k: FieldKey, v: string) => void;
}) {
  const prefix = `medications.${index}`;
  return (
    <div className="border border-[#1e2130] rounded-md overflow-hidden">
      <div className="bg-[#10121c] px-3 py-1.5 border-b border-[#1e2130]">
        <span className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest">
          Medication #{index + 1}
        </span>
      </div>
      <div className="px-3 py-2 flex flex-col gap-1">
        {(
          [
            ['medication_name', 'Drug Name'],
            ['dosage', 'Dosage'],
            ['frequency', 'Frequency'],
            ['duration', 'Duration'],
            ['instructions', 'Instructions'],
          ] as Array<[keyof MedicationExtraction, string]>
        ).map(([subField, label]) => {
          const key = `${prefix}.${subField}`;
          const field = med[subField] as FieldExtraction;
          return (
            <FieldRow
              key={key}
              label={label}
              fieldKey={key}
              field={field}
              isHovered={hoveredField === key}
              correction={corrections[key]}
              onHoverEnter={() => onHoverEnter(key)}
              onHoverLeave={onHoverLeave}
              onCorrection={(v) => onCorrection(key, v)}
            />
          );
        })}
      </div>
    </div>
  );
}
