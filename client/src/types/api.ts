// ─── Shared API Types ───────────────────────────────────────────────────────
// Both server and client import from this file.
// Server: import from '../types/api'
// Client: import from '../../types/api'  (or copy into client/src/types/)

export type DocumentType =
  | 'lab_report'
  | 'discharge_summary'
  | 'prescription'
  | 'imaging'
  | 'vaccination'
  | 'consultation'
  | 'other';

export type DocumentStatus = 'pending' | 'processing' | 'done' | 'failed';
export type InteractionSeverity = 'none' | 'mild' | 'moderate' | 'severe';
export type PrescriptionStatus = 'active' | 'discontinued';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
export type UserMode = 'patient' | 'doctor';
export type ChatRole = 'user' | 'assistant';
export type ProcessingStep = 'saving' | 'analyzing' | 'embedding' | 'storing' | 'done' | 'failed';
export type AnomalyDirection = 'increasing' | 'decreasing' | 'stable';
export type AnomalySeverity = 'mild' | 'moderate' | 'severe';

// ─── Medication ──────────────────────────────────────────────────────────────
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

// ─── Lab Value ───────────────────────────────────────────────────────────────
export interface LabValue {
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  is_abnormal: boolean;
}

// ─── Prescription BBox Extraction (Viewer) ────────────────────────────────────
export interface FieldExtraction {
  value: string | null;
  bounding_box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0–1
  confidence_score: number; // 1–100
  confidence_reason: string;
}

export interface MedicationExtraction {
  medication_name: FieldExtraction;
  dosage: FieldExtraction;
  frequency: FieldExtraction;
  duration: FieldExtraction;
  instructions: FieldExtraction;
}

export interface PrescriptionExtraction {
  patient_name: FieldExtraction;
  doctor_name: FieldExtraction;
  date: FieldExtraction;
  medications: MedicationExtraction[];
  diagnosis: FieldExtraction;
  overall_legibility: number;
  manualCorrections?: Record<string, string>;
  confirmedAt?: string;
}

export interface PrescriptionExtractionResponse {
  extraction: PrescriptionExtraction;
  imageUrl: string;
  filename: string;
  status: DocumentStatus;
}

// ─── Document ────────────────────────────────────────────────────────────────
export interface MedDocument {
  _id: string;
  userId: string;
  filename: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  uploadedAt: string;
  processedAt?: string;
  documentType: DocumentType;
  documentDate?: string;
  sourceHospital?: string;
  doctorName?: string;
  conditionsMentioned: string[];
  medications: Medication[];
  labValues: LabValue[];
  summaryPlain: string;
  summaryClinical: string;
  criticalityScore: number; // 1–10
  keyFindings: string[];
  tags: string[];
  rawGeminiResponse?: string;
}

// ─── Prescription ─────────────────────────────────────────────────────────────
export interface Prescription {
  _id: string;
  userId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  prescribingDoctor: string;
  startDate: string;
  endDate?: string;
  status: PrescriptionStatus;
  sourceDocumentId?: string;
  interactionWarnings: string[];
  interactionSeverity: InteractionSeverity;
  createdAt: string;
}

// ─── Interaction Graph ────────────────────────────────────────────────────────
export interface GraphNode {
  id: string;
  label: string;
  status: PrescriptionStatus;
}

export interface GraphEdge {
  source: string;
  target: string;
  severity: InteractionSeverity;
  description: string;
}

export interface InteractionGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface MedUser {
  _id: string;
  email: string;
  name: string;
  photoUrl?: string;
  bloodType: BloodType;
  dateOfBirth?: string;
  allergies: string[];
  emergencyContacts: EmergencyContact[];
  emergencyToken: string;
  modePreference: UserMode;
  createdAt: string;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
export interface TimelineMonth {
  month: string; // e.g. "Jan 2023"
  criticalityMax: number;
  criticalityAvg: number;
  eventCount: number;
  types: DocumentType[];
}

// ─── Anomaly ──────────────────────────────────────────────────────────────────
export interface LabReading {
  value: number;
  unit: string;
  date: string;
  documentId: string;
}

export interface Anomaly {
  _id: string;
  testName: string;
  readings: LabReading[];
  direction: AnomalyDirection;
  severity: AnomalySeverity;
  plainExplanation: string;
  clinicalExplanation: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: ChatRole;
  content: string;
  sourceDocIds: string[];
  timestamp: string;
}

export interface ChatSession {
  _id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

// ─── Dashboard Summary ────────────────────────────────────────────────────────
export interface DashboardSummary {
  totalDocuments: number;
  lastProcessedDate?: string;
  overallHealthScore: number; // 1–10, higher is healthier
  anomalyCount: number;
  activePrescriptionCount: number;
  daysTracked: number;
}

// ─── Socket Events ────────────────────────────────────────────────────────────
export interface DocumentStatusEvent {
  docId: string;
  status: DocumentStatus;
  step: ProcessingStep;
  data?: Partial<MedDocument>;
}

// ─── API Response Wrappers ───────────────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: number;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Alerts & Insights ───────────────────────────────────────────────────────
export type AlertCategory = 'abnormal' | 'sudden_change' | 'missing_test' | 'suggestion';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface HealthAlert {
  _id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  /** Plain-language action the user should take */
  action?: string;
  /** Which specialist to see, if a suggestion */
  specialist?: string;
  /** Related lab test name */
  relatedTest?: string;
  /** Related document ID */
  relatedDocumentId?: string;
  /** ISO date the alert was generated */
  createdAt: string;
  /** True if the user has dismissed this alert */
  dismissed: boolean;
}

