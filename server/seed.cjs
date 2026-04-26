/**
 * MedVault — MongoDB Atlas Seed Script
 * Run: node seed.js
 * Requires: npm install mongodb
 * Set MONGODB_URI env var or edit the uri below.
 */

require('dotenv').config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority";
const DB_NAME = "medvault";

// ─────────────────────────────────────────────
// IDENTITY MAP
// Email → Firebase UID is assigned at first Google login.
// Replace each FIREBASE_UID_* placeholder below with the real UID
// from Firebase Console → Authentication → Users after your first login.
//
//  simepurushkarchirag84@gmail.com  →  FIREBASE_UID_CHIRAG
//  mananchodankar77@gmail.com       →  FIREBASE_UID_MANAN
//  austengomes15@gmail.com          →  FIREBASE_UID_AUSTEN
//  austenmarwingomes@gmail.com      →  FIREBASE_UID_AUSTEN_MARWIN
// ─────────────────────────────────────────────
const UID = {
  chirag:       process.env.UID_CHIRAG        || "FIREBASE_UID_CHIRAG",
  manan:        process.env.UID_MANAN         || "FIREBASE_UID_MANAN",
  austen:       process.env.UID_AUSTEN        || "FIREBASE_UID_AUSTEN",
  austenMarwin: process.env.UID_AUSTEN_MARWIN || "FIREBASE_UID_AUSTEN_MARWIN",
};

// ─────────────────────────────────────────────
// 4 USERS  (one per WhatsApp number)
// ─────────────────────────────────────────────
const USERS = [
  {
    _id: UID.chirag,
    email: "simepurushkarchirag84@gmail.com",
    name: "Chirag Simepurushkar",
    photoUrl: null,
    bloodType: "B+",
    dateOfBirth: new Date("1998-03-15"),
    allergies: ["Penicillin", "Aspirin"],
    emergencyContacts: [
      { name: "Ravi Simepurushkar", phone: "+919876543210", relationship: "Father" },
    ],
    emergencyToken: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    modePreference: "patient",
    whatsappPhone: "+919359025745",
    notificationPrefs: { delivered: true, failed: true, upcoming: true, marketing: false },
    uiPrefs: { themeId: "dark-teal", mode: "patient" },
  },
  {
    _id: UID.manan,
    email: "mananchodankar77@gmail.com",
    name: "Manan Chodankar",
    photoUrl: null,
    bloodType: "A+",
    dateOfBirth: new Date("1992-07-22"),
    allergies: ["Sulfonamides"],
    emergencyContacts: [
      { name: "Rajesh Chodankar", phone: "+919823456789", relationship: "Father" },
    ],
    emergencyToken: "a3f1bc20-91de-47ea-b123-5c67d8e90f12",
    modePreference: "patient",
    whatsappPhone: "+917620909471",
    notificationPrefs: { delivered: true, failed: true, upcoming: true, marketing: true },
    uiPrefs: { themeId: "light-blue", mode: "patient" },
  },
  {
    _id: UID.austen,
    email: "austengomes15@gmail.com",
    name: "Austen Gomes",
    photoUrl: null,
    bloodType: "O+",
    dateOfBirth: new Date("1985-11-08"),
    allergies: [],
    emergencyContacts: [
      { name: "Maria Gomes", phone: "+919765432100", relationship: "Mother" },
    ],
    emergencyToken: "c9d2ef34-bc45-56fg-d678-9h01i2j34k56",
    modePreference: "doctor",
    whatsappPhone: "+919673665686",
    notificationPrefs: { delivered: true, failed: false, upcoming: true, marketing: false },
    uiPrefs: { themeId: "dark-purple", mode: "doctor" },
  },
  {
    _id: UID.austenMarwin,
    email: "austenmarwingomes@gmail.com",
    name: "Austen Marwin Gomes",
    photoUrl: null,
    bloodType: "AB-",
    dateOfBirth: new Date("2001-05-30"),
    allergies: ["Latex", "NSAIDs"],
    emergencyContacts: [
      { name: "Maria Gomes", phone: "+919812345678", relationship: "Mother" },
    ],
    emergencyToken: "d8e3fg45-cd56-67gh-e789-0i12j3k45l67",
    modePreference: "patient",
    whatsappPhone: "+919284638248",
    notificationPrefs: { delivered: true, failed: true, upcoming: false, marketing: false },
    uiPrefs: { themeId: "light-green", mode: "patient" },
  },
];

// ─────────────────────────────────────────────
// DOCUMENTS  (2–3 per user, clinically accurate)
// ─────────────────────────────────────────────
const DOCUMENTS = [
  // ── Chirag ──────────────────────────────────
  {
    userId: UID.chirag,
    filename: "blood_test_march2025.jpg",
    filePath: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    mimeType: "image/jpeg",
    fileSize: 245000,
    status: "done",
    documentType: "lab_report",
    documentDate: new Date("2025-03-10"),
    sourceHospital: "Kokilaben Dhirubhai Ambani Hospital, Mumbai",
    doctorName: "Dr. Priya Mehta",
    conditionsMentioned: ["Type 2 Diabetes Mellitus", "Mild Normocytic Anaemia"],
    medications: [
      { name: "Metformin", dosage: "500 mg", frequency: "Twice daily with meals", duration: "3 months" },
    ],
    labValues: [
      { test_name: "HbA1c",           value: "7.8",  unit: "%",      reference_range: "4.0–5.6",   is_abnormal: true  },
      { test_name: "Fasting Glucose", value: "142",  unit: "mg/dL",  reference_range: "70–100",    is_abnormal: true  },
      { test_name: "Haemoglobin",     value: "11.2", unit: "g/dL",   reference_range: "13.5–17.5", is_abnormal: true  },
      { test_name: "MCV",             value: "84",   unit: "fL",     reference_range: "80–100",    is_abnormal: false },
      { test_name: "Serum Creatinine",value: "0.9",  unit: "mg/dL",  reference_range: "0.7–1.3",  is_abnormal: false },
      { test_name: "eGFR",            value: "88",   unit: "mL/min/1.73m²", reference_range: ">60", is_abnormal: false },
    ],
    summaryPlain:
      "Your blood sugar (HbA1c 7.8 %) is above the healthy range, meaning your diabetes needs better control. Your haemoglobin is slightly low, which can cause tiredness. Your kidneys are working well.",
    summaryClinical:
      "HbA1c 7.8 % indicates suboptimal glycaemic control. Mild normocytic anaemia (Hb 11.2 g/dL, MCV 84 fL) — evaluate for iron, B12/folate deficiency. Renal function within normal limits (eGFR 88). Recommend antidiabetic therapy titration and haematinic workup.",
    criticalityScore: 6,
    keyFindings: ["Elevated HbA1c 7.8 %", "Haemoglobin 11.2 g/dL (below range)", "Fasting glucose 142 mg/dL"],
    tags: ["diabetes", "anaemia", "blood-test", "glucose", "hba1c"],
    embedding: [],
    processedAt: new Date("2025-03-11T08:30:00Z"),
  },
  {
    userId: UID.chirag,
    filename: "prescription_amlodipine_nov2024.pdf",
    filePath: "https://res.cloudinary.com/demo/image/upload/sample.pdf",
    mimeType: "application/pdf",
    fileSize: 84000,
    status: "done",
    documentType: "prescription",
    documentDate: new Date("2024-11-01"),
    sourceHospital: "Lilavati Hospital, Mumbai",
    doctorName: "Dr. Arvind Sharma",
    conditionsMentioned: ["Essential Hypertension"],
    medications: [
      { name: "Amlodipine", dosage: "5 mg", frequency: "Once daily at bedtime", duration: "Ongoing" },
      { name: "Telmisartan", dosage: "40 mg", frequency: "Once daily in the morning", duration: "Ongoing" },
    ],
    labValues: [],
    summaryPlain:
      "You have been prescribed two blood pressure medications — Amlodipine and Telmisartan — to keep your blood pressure under control. Take them every day as directed.",
    summaryClinical:
      "Prescription for stage-1 essential hypertension. Dual antihypertensive therapy: Amlodipine 5 mg (CCB) nocte + Telmisartan 40 mg (ARB) OD morning. Target BP <130/80 mmHg. Review in 4 weeks.",
    criticalityScore: 4,
    keyFindings: ["Dual antihypertensive initiated", "Amlodipine 5 mg + Telmisartan 40 mg", "BP target <130/80 mmHg"],
    tags: ["hypertension", "amlodipine", "telmisartan", "prescription"],
    embedding: [],
    processedAt: new Date("2024-11-02T10:00:00Z"),
  },

  // ── Priya ────────────────────────────────────
  {
    userId: UID.manan,
    filename: "thyroid_panel_jan2025.jpg",
    filePath: "https://res.cloudinary.com/demo/image/upload/sample2.jpg",
    mimeType: "image/jpeg",
    fileSize: 198000,
    status: "done",
    documentType: "lab_report",
    documentDate: new Date("2025-01-18"),
    sourceHospital: "Ruby Hall Clinic, Pune",
    doctorName: "Dr. Kavita Joshi",
    conditionsMentioned: ["Hypothyroidism", "Hypercholesterolaemia"],
    medications: [
      { name: "Levothyroxine", dosage: "50 mcg", frequency: "Once daily on empty stomach", duration: "Ongoing" },
    ],
    labValues: [
      { test_name: "TSH",          value: "8.4",  unit: "mIU/L",  reference_range: "0.4–4.0",  is_abnormal: true  },
      { test_name: "Free T4",      value: "0.7",  unit: "ng/dL",  reference_range: "0.8–1.8",  is_abnormal: true  },
      { test_name: "Free T3",      value: "2.9",  unit: "pg/mL",  reference_range: "2.3–4.2",  is_abnormal: false },
      { test_name: "Total Cholesterol", value: "218", unit: "mg/dL", reference_range: "<200",  is_abnormal: true  },
      { test_name: "LDL",          value: "138",  unit: "mg/dL",  reference_range: "<100",     is_abnormal: true  },
      { test_name: "HDL",          value: "52",   unit: "mg/dL",  reference_range: ">50",      is_abnormal: false },
      { test_name: "Triglycerides",value: "140",  unit: "mg/dL",  reference_range: "<150",     is_abnormal: false },
    ],
    summaryPlain:
      "Your thyroid gland is underactive (TSH 8.4) — this means your body isn't making enough thyroid hormone, which can cause fatigue and weight gain. Your cholesterol is also slightly elevated. Your doctor has started you on Levothyroxine to correct the thyroid levels.",
    summaryClinical:
      "Overt primary hypothyroidism: TSH 8.4 mIU/L, Free T4 0.7 ng/dL. Initiated Levothyroxine 50 mcg OD on empty stomach; recheck TFT in 6–8 weeks. Borderline hypercholesterolaemia (LDL 138 mg/dL) likely secondary to hypothyroidism — reassess lipid panel after thyroid replacement.",
    criticalityScore: 5,
    keyFindings: ["TSH 8.4 mIU/L — overt hypothyroidism", "Free T4 0.7 ng/dL (low)", "LDL 138 mg/dL elevated"],
    tags: ["thyroid", "hypothyroidism", "cholesterol", "tsh", "levothyroxine"],
    embedding: [],
    processedAt: new Date("2025-01-19T09:00:00Z"),
  },
  {
    userId: UID.manan,
    filename: "antenatal_discharge_summary_feb2025.pdf",
    filePath: "https://res.cloudinary.com/demo/image/upload/sample3.pdf",
    mimeType: "application/pdf",
    fileSize: 310000,
    status: "done",
    documentType: "discharge_summary",
    documentDate: new Date("2025-02-05"),
    sourceHospital: "Ruby Hall Clinic, Pune",
    doctorName: "Dr. Sunanda Rao",
    conditionsMentioned: ["Gestational Hypertension", "Oligohydramnios — resolved"],
    medications: [
      { name: "Labetalol", dosage: "100 mg", frequency: "Twice daily", duration: "Until review at 36 weeks" },
      { name: "Ferrous Sulphate + Folic Acid", dosage: "200 mg / 0.5 mg", frequency: "Once daily", duration: "Until delivery" },
    ],
    labValues: [
      { test_name: "Blood Pressure at Admission", value: "148/96", unit: "mmHg", reference_range: "<140/90", is_abnormal: true },
      { test_name: "Urine Protein",               value: "Trace", unit: "",      reference_range: "Negative", is_abnormal: false },
      { test_name: "AFI (Amniotic Fluid Index)",  value: "7.2",   unit: "cm",    reference_range: "8–24",   is_abnormal: false },
    ],
    summaryPlain:
      "You were admitted for high blood pressure during pregnancy. Your blood pressure has been brought under control with Labetalol. There was mild low amniotic fluid earlier, which has now improved. Continue your medications and attend your next review at 36 weeks.",
    summaryClinical:
      "28-year-old G2P1 admitted at 32 weeks POG with gestational hypertension (BP 148/96 mmHg). No proteinuria; preeclampsia criteria not met. Oligohydramnios (AFI 7.2 cm) noted on USG — resolved on repeat scan (AFI 9.4 cm). Initiated Labetalol 100 mg BD; BP stabilised to 128/82 mmHg at discharge. Continue iron-folate supplementation. Review at 36 weeks.",
    criticalityScore: 7,
    keyFindings: ["Gestational hypertension managed with Labetalol", "AFI improved — 9.4 cm at discharge", "No proteinuria — preeclampsia excluded"],
    tags: ["obstetrics", "gestational-hypertension", "antenatal", "oligohydramnios", "labetalol"],
    embedding: [],
    processedAt: new Date("2025-02-06T11:00:00Z"),
  },

  // ── Rahul ────────────────────────────────────
  {
    userId: UID.austen,
    filename: "lipid_profile_ecg_feb2025.pdf",
    filePath: "https://res.cloudinary.com/demo/image/upload/sample4.pdf",
    mimeType: "application/pdf",
    fileSize: 420000,
    status: "done",
    documentType: "consultation",
    documentDate: new Date("2025-02-20"),
    sourceHospital: "Wockhardt Hospital, Mumbai",
    doctorName: "Dr. Manish Agarwal",
    conditionsMentioned: ["Dyslipidaemia", "GERD"],
    medications: [
      { name: "Rosuvastatin",  dosage: "10 mg", frequency: "Once daily at bedtime", duration: "3 months" },
      { name: "Pantoprazole",  dosage: "40 mg", frequency: "Once daily before breakfast", duration: "4 weeks" },
    ],
    labValues: [
      { test_name: "Total Cholesterol",  value: "241", unit: "mg/dL", reference_range: "<200",  is_abnormal: true  },
      { test_name: "LDL",                value: "158", unit: "mg/dL", reference_range: "<100",  is_abnormal: true  },
      { test_name: "HDL",                value: "38",  unit: "mg/dL", reference_range: ">40",   is_abnormal: true  },
      { test_name: "VLDL",               value: "45",  unit: "mg/dL", reference_range: "5–40",  is_abnormal: true  },
      { test_name: "Triglycerides",      value: "224", unit: "mg/dL", reference_range: "<150",  is_abnormal: true  },
      { test_name: "Non-HDL Cholesterol",value: "203", unit: "mg/dL", reference_range: "<130",  is_abnormal: true  },
      { test_name: "ECG — Rate",         value: "78",  unit: "bpm",   reference_range: "60–100",is_abnormal: false },
      { test_name: "ECG — Rhythm",       value: "Normal Sinus Rhythm", unit: "", reference_range: "", is_abnormal: false },
    ],
    summaryPlain:
      "Your cholesterol and triglycerides are higher than they should be. Your good cholesterol (HDL) is slightly low. A statin (Rosuvastatin) has been prescribed to bring these values down. You also have acid reflux symptoms — Pantoprazole has been added for that.",
    summaryClinical:
      "Mixed dyslipidaemia: elevated LDL 158 mg/dL, hypertriglyceridaemia 224 mg/dL, low HDL 38 mg/dL. 10-year ASCVD risk: intermediate. Initiated Rosuvastatin 10 mg nocte; lifestyle modification advised (Mediterranean diet, aerobic exercise 150 min/week). ECG: NSR, no ischaemic changes. Concurrent GERD symptoms — Pantoprazole 40 mg OD for 4 weeks.",
    criticalityScore: 6,
    keyFindings: ["LDL 158 mg/dL — significantly elevated", "Triglycerides 224 mg/dL", "Low HDL 38 mg/dL"],
    tags: ["dyslipidaemia", "cholesterol", "rosuvastatin", "gerd", "cardiac-risk"],
    embedding: [],
    processedAt: new Date("2025-02-21T14:00:00Z"),
  },
  {
    userId: UID.austen,
    filename: "xray_chest_jan2025.jpg",
    filePath: "https://res.cloudinary.com/demo/image/upload/sample5.jpg",
    mimeType: "image/jpeg",
    fileSize: 512000,
    status: "done",
    documentType: "imaging",
    documentDate: new Date("2025-01-05"),
    sourceHospital: "Wockhardt Hospital, Mumbai",
    doctorName: "Dr. Neha Kapoor",
    conditionsMentioned: ["Community-Acquired Pneumonia — right lower lobe (resolved)"],
    medications: [
      { name: "Amoxicillin-Clavulanate", dosage: "625 mg", frequency: "Twice daily", duration: "7 days — completed" },
    ],
    labValues: [
      { test_name: "CXR Findings", value: "Consolidation right lower lobe — resolved on follow-up", unit: "", reference_range: "Clear lung fields", is_abnormal: false },
      { test_name: "SpO2",         value: "98", unit: "%", reference_range: "≥95", is_abnormal: false },
      { test_name: "CRP",          value: "4.2", unit: "mg/L", reference_range: "<5.0", is_abnormal: false },
    ],
    summaryPlain:
      "Your chest X-ray shows that the pneumonia in your right lower lung has completely resolved. Your oxygen levels are normal. No further antibiotic treatment is needed.",
    summaryClinical:
      "Follow-up CXR post-treatment for right lower lobe CAP (S. pneumoniae suspected). Radiological resolution confirmed; no residual consolidation or pleural effusion. SpO2 98 % RA, CRP normalised at 4.2 mg/L. Patient clinically well. No further antibiotics required.",
    criticalityScore: 2,
    keyFindings: ["Right lower lobe pneumonia — fully resolved", "SpO2 98 %", "CRP normalised"],
    tags: ["pneumonia", "chest-xray", "imaging", "resolved", "cxr"],
    embedding: [],
    processedAt: new Date("2025-01-06T10:00:00Z"),
  },

  // ── Sneha ────────────────────────────────────
  {
    userId: UID.austenMarwin,
    filename: "allergy_test_report_dec2024.pdf",
    filePath: "https://res.cloudinary.com/demo/image/upload/sample6.pdf",
    mimeType: "application/pdf",
    fileSize: 175000,
    status: "done",
    documentType: "lab_report",
    documentDate: new Date("2024-12-12"),
    sourceHospital: "Deenanath Mangeshkar Hospital, Pune",
    doctorName: "Dr. Rohini Phadke",
    conditionsMentioned: ["Allergic Rhinitis", "Latex Allergy", "NSAID Hypersensitivity"],
    medications: [
      { name: "Cetirizine",       dosage: "10 mg", frequency: "Once daily at bedtime", duration: "As needed" },
      { name: "Fluticasone Nasal Spray", dosage: "50 mcg/spray, 2 sprays each nostril", frequency: "Once daily in the morning", duration: "3 months" },
    ],
    labValues: [
      { test_name: "Total IgE",          value: "420",  unit: "IU/mL", reference_range: "0–100",  is_abnormal: true  },
      { test_name: "Specific IgE — Dust Mite (Der p 1)", value: "3.8", unit: "kUA/L", reference_range: "<0.35", is_abnormal: true },
      { test_name: "Specific IgE — Latex (Hev b)", value: "2.1", unit: "kUA/L", reference_range: "<0.35", is_abnormal: true },
      { test_name: "Specific IgE — Aspirin/NSAIDs", value: "Positive SPT", unit: "", reference_range: "Negative", is_abnormal: true },
      { test_name: "Eosinophil Count",   value: "620",  unit: "cells/µL", reference_range: "100–500", is_abnormal: true },
      { test_name: "ANC (Absolute Neutrophil Count)", value: "3800", unit: "cells/µL", reference_range: "1800–7500", is_abnormal: false },
    ],
    summaryPlain:
      "Your allergy tests show that you are allergic to dust mites, latex, and anti-inflammatory pain medicines (NSAIDs like Ibuprofen). Your immune allergy level (IgE) is quite high. You have been prescribed a nasal spray and an antihistamine (Cetirizine) to manage symptoms. Always inform healthcare providers about your latex and NSAID allergies.",
    summaryClinical:
      "Elevated total IgE 420 IU/mL with sensitisation to Dermatophagoides pteronyssinus (Der p 1, class 3), latex (Hev b, class 2), and confirmed NSAID hypersensitivity (aspirin-exacerbated respiratory disease pattern on SPT). Peripheral eosinophilia 620 cells/µL. Initiated intranasal Fluticasone + PRN Cetirizine. Allergen avoidance counselled. Medical alert for latex-free and NSAID-free care.",
    criticalityScore: 5,
    keyFindings: ["Total IgE 420 IU/mL — markedly elevated", "Latex allergy confirmed — alert for procedures", "NSAID hypersensitivity — avoid ibuprofen/aspirin"],
    tags: ["allergy", "ige", "latex", "nsaid", "rhinitis", "eosinophilia"],
    embedding: [],
    processedAt: new Date("2024-12-13T09:30:00Z"),
  },
  {
    userId: UID.austenMarwin,
    filename: "vaccination_record_2024.pdf",
    filePath: "https://res.cloudinary.com/demo/image/upload/sample7.pdf",
    mimeType: "application/pdf",
    fileSize: 92000,
    status: "done",
    documentType: "vaccination",
    documentDate: new Date("2024-10-20"),
    sourceHospital: "Primary Health Centre, Pune",
    doctorName: "Dr. Anand Bapat",
    conditionsMentioned: [],
    medications: [],
    labValues: [],
    summaryPlain:
      "Your vaccination record is up to date. You received the influenza vaccine and COVID-19 booster in October 2024. Due vaccines: Tdap booster recommended in 2027.",
    summaryClinical:
      "Adult immunisation update: Inactivated Influenza Vaccine (IIV4) — 0.5 mL IM deltoid, administered 20 Oct 2024. COVID-19 XBB.1.5 booster (Comirnaty) — 0.3 mL IM, 20 Oct 2024. No adverse reactions at 30-min observation. Tdap booster due 2027. Hepatitis B serology advised (3-dose series not documented).",
    criticalityScore: 1,
    keyFindings: ["Influenza vaccine administered Oct 2024", "COVID-19 XBB booster administered Oct 2024", "Tdap booster due 2027"],
    tags: ["vaccination", "influenza", "covid-booster", "immunisation"],
    embedding: [],
    processedAt: new Date("2024-10-21T08:00:00Z"),
  },
];

// ─────────────────────────────────────────────
// PRESCRIPTIONS  (active/discontinued per user)
// ─────────────────────────────────────────────
const PRESCRIPTIONS = [
  // Chirag
  {
    userId: UID.chirag,
    drugName: "Metformin",
    dosage: "500 mg",
    frequency: "Twice daily with meals",
    prescribingDoctor: "Dr. Priya Mehta",
    startDate: new Date("2025-03-10"),
    status: "active",
    interactionWarnings: ["Long-term use may deplete Vitamin B12 — monitor annually"],
    interactionSeverity: "mild",
  },
  {
    userId: UID.chirag,
    drugName: "Amlodipine",
    dosage: "5 mg",
    frequency: "Once daily at bedtime",
    prescribingDoctor: "Dr. Arvind Sharma",
    startDate: new Date("2024-11-01"),
    status: "active",
    interactionWarnings: [],
    interactionSeverity: "none",
  },
  {
    userId: UID.chirag,
    drugName: "Telmisartan",
    dosage: "40 mg",
    frequency: "Once daily in the morning",
    prescribingDoctor: "Dr. Arvind Sharma",
    startDate: new Date("2024-11-01"),
    status: "active",
    interactionWarnings: ["Avoid concurrent NSAIDs — may reduce antihypertensive efficacy", "Monitor serum potassium with ACE-I co-administration"],
    interactionSeverity: "moderate",
  },

  // Priya
  {
    userId: UID.manan,
    drugName: "Levothyroxine",
    dosage: "50 mcg",
    frequency: "Once daily on empty stomach, 30 min before breakfast",
    prescribingDoctor: "Dr. Kavita Joshi",
    startDate: new Date("2025-01-19"),
    status: "active",
    interactionWarnings: ["Absorption reduced by calcium, iron, antacids — separate by 4 hours", "May increase anticoagulant effect of warfarin"],
    interactionSeverity: "moderate",
  },
  {
    userId: UID.manan,
    drugName: "Labetalol",
    dosage: "100 mg",
    frequency: "Twice daily",
    prescribingDoctor: "Dr. Sunanda Rao",
    startDate: new Date("2025-02-05"),
    status: "active",
    interactionWarnings: ["Do not discontinue abruptly — taper under supervision"],
    interactionSeverity: "mild",
  },
  {
    userId: UID.manan,
    drugName: "Ferrous Sulphate + Folic Acid",
    dosage: "200 mg / 0.5 mg",
    frequency: "Once daily",
    prescribingDoctor: "Dr. Sunanda Rao",
    startDate: new Date("2025-02-05"),
    status: "active",
    interactionWarnings: ["Avoid simultaneous intake with Levothyroxine — separate by at least 2 hours", "May cause black stools — normal"],
    interactionSeverity: "mild",
  },

  // Rahul
  {
    userId: UID.austen,
    drugName: "Rosuvastatin",
    dosage: "10 mg",
    frequency: "Once daily at bedtime",
    prescribingDoctor: "Dr. Manish Agarwal",
    startDate: new Date("2025-02-20"),
    status: "active",
    interactionWarnings: ["Report unexplained muscle pain or weakness immediately — risk of myopathy", "Avoid grapefruit juice in large quantities"],
    interactionSeverity: "moderate",
  },
  {
    userId: UID.austen,
    drugName: "Pantoprazole",
    dosage: "40 mg",
    frequency: "Once daily before breakfast",
    prescribingDoctor: "Dr. Manish Agarwal",
    startDate: new Date("2025-02-20"),
    endDate: new Date("2025-03-20"),
    status: "discontinued",
    interactionWarnings: ["May reduce absorption of Clopidogrel if co-prescribed"],
    interactionSeverity: "mild",
  },
  {
    userId: UID.austen,
    drugName: "Amoxicillin-Clavulanate",
    dosage: "625 mg",
    frequency: "Twice daily",
    prescribingDoctor: "Dr. Neha Kapoor",
    startDate: new Date("2024-12-28"),
    endDate: new Date("2025-01-04"),
    status: "discontinued",
    interactionWarnings: [],
    interactionSeverity: "none",
  },

  // Sneha
  {
    userId: UID.austenMarwin,
    drugName: "Cetirizine",
    dosage: "10 mg",
    frequency: "Once daily at bedtime (as needed during allergy season)",
    prescribingDoctor: "Dr. Rohini Phadke",
    startDate: new Date("2024-12-12"),
    status: "active",
    interactionWarnings: ["May cause drowsiness — avoid driving after first dose", "Additive CNS depression with alcohol"],
    interactionSeverity: "mild",
  },
  {
    userId: UID.austenMarwin,
    drugName: "Fluticasone Nasal Spray",
    dosage: "50 mcg/spray, 2 sprays each nostril",
    frequency: "Once daily in the morning",
    prescribingDoctor: "Dr. Rohini Phadke",
    startDate: new Date("2024-12-12"),
    status: "active",
    interactionWarnings: [],
    interactionSeverity: "none",
  },
];

// ─────────────────────────────────────────────
// WHATSAPP MESSAGES  (realistic multi-turn)
// ─────────────────────────────────────────────
const WHATSAPP_MESSAGES = [
  // Chirag — +919359025745
  { userId: UID.chirag, phoneNumber: "+919359025745", direction: "in",  content: "Hi, show me my latest health summary",                                                   timestamp: new Date("2025-04-25T08:01:00Z") },
  { userId: UID.chirag, phoneNumber: "+919359025745", direction: "out", content: "🟡 Your Health Summary\n\n📊 2 records on file\n📈 Health index: 6/10\n\n⚠️ Key concerns:\n• HbA1c 7.8 % — diabetes needs better control\n• Haemoglobin 11.2 g/dL — mild anaemia\n\n✅ Kidneys normal (eGFR 88). BP medications active.", timestamp: new Date("2025-04-25T08:01:05Z") },
  { userId: UID.chirag, phoneNumber: "+919359025745", direction: "in",  content: "What medications am I currently on?",                                                     timestamp: new Date("2025-04-25T08:02:00Z") },
  { userId: UID.chirag, phoneNumber: "+919359025745", direction: "out", content: "💊 Your Active Medications:\n\n1. Metformin 500 mg — twice daily with meals (diabetes)\n2. Amlodipine 5 mg — once daily at bedtime (BP)\n3. Telmisartan 40 mg — once daily morning (BP)\n\n⚠️ Reminder: Avoid NSAIDs — they may reduce Telmisartan's effectiveness.", timestamp: new Date("2025-04-25T08:02:04Z") },

  // Priya — +917620909471
  { userId: UID.manan, phoneNumber: "+917620909471", direction: "in",  content: "My TSH came back high again. What does that mean?",                                       timestamp: new Date("2025-04-25T10:15:00Z") },
  { userId: UID.manan, phoneNumber: "+917620909471", direction: "out", content: "📋 Based on your records:\n\nTSH 8.4 mIU/L (normal: 0.4–4.0) indicates your thyroid is underactive.\n\nThis can cause fatigue, weight gain, and feeling cold.\n\n✅ You're already on Levothyroxine 50 mcg. Take it on an empty stomach — 30 min before breakfast. Your doctor may adjust the dose at your next review.\n\n⚠️ Keep iron/calcium supplements 4 hours apart from Levothyroxine.", timestamp: new Date("2025-04-25T10:15:07Z") },
  { userId: UID.manan, phoneNumber: "+917620909471", direction: "in",  content: "Is Labetalol safe during pregnancy?",                                                       timestamp: new Date("2025-04-25T10:17:00Z") },
  { userId: UID.manan, phoneNumber: "+917620909471", direction: "out", content: "✅ Yes — Labetalol is considered one of the preferred antihypertensives in pregnancy (FDA Category C, widely used). Your OB-GYN Dr. Sunanda Rao prescribed it specifically for gestational hypertension.\n\nDo not stop it without consulting her. Your next review is at 36 weeks.", timestamp: new Date("2025-04-25T10:17:06Z") },

  // Rahul — +919673665686
  { userId: UID.austen, phoneNumber: "+919673665686", direction: "in",  content: "Check my cholesterol report",                                                               timestamp: new Date("2025-04-25T18:30:00Z") },
  { userId: UID.austen, phoneNumber: "+919673665686", direction: "out", content: "📊 Lipid Profile — 20 Feb 2025 (Wockhardt Hospital)\n\n• Total Cholesterol: 241 mg/dL ⚠️ (target <200)\n• LDL: 158 mg/dL 🔴 (target <100)\n• HDL: 38 mg/dL ⚠️ (target >40)\n• Triglycerides: 224 mg/dL 🔴 (target <150)\n\n💊 Rosuvastatin 10 mg prescribed at bedtime. Recheck lipids in 3 months.", timestamp: new Date("2025-04-25T18:30:05Z") },
  { userId: UID.austen, phoneNumber: "+919673665686", direction: "in",  content: "Any foods I should avoid?",                                                                   timestamp: new Date("2025-04-25T18:31:00Z") },
  { userId: UID.austen, phoneNumber: "+919673665686", direction: "out", content: "🥗 Dietary tips for your lipid profile:\n\n❌ Avoid: Fried foods, red/processed meat, full-fat dairy, coconut/palm oil, baked goods with trans fats.\n\n✅ Prefer: Oats, olive oil, fatty fish (salmon/mackerel), flaxseeds, walnuts, fresh vegetables, legumes.\n\n🏃 Also: Aim for 30 min of brisk walking 5 days a week — it raises HDL.", timestamp: new Date("2025-04-25T18:31:06Z") },

  // Sneha — +919284638248
  { userId: UID.austenMarwin, phoneNumber: "+919284638248", direction: "in",  content: "I have a runny nose and sneezing since morning. What should I take?",                      timestamp: new Date("2025-04-26T07:45:00Z") },
  { userId: UID.austenMarwin, phoneNumber: "+919284638248", direction: "out", content: "🤧 Based on your allergy profile (dust mite & allergic rhinitis):\n\n💊 You can take your prescribed Cetirizine 10 mg tonight.\n\n🌬️ Continue your Fluticasone nasal spray — 2 sprays each nostril in the morning.\n\n⚠️ IMPORTANT: Do NOT take Ibuprofen, Aspirin, or any NSAID-based cold medicines. You have confirmed NSAID hypersensitivity. Use Paracetamol (500 mg) for any associated headache/fever.\n\nIf symptoms persist beyond 5 days, consult Dr. Phadke.", timestamp: new Date("2025-04-26T07:45:08Z") },
  { userId: UID.austenMarwin, phoneNumber: "+919284638248", direction: "in",  content: "I'm going to hospital for a procedure next week. Anything the doctor should know?",         timestamp: new Date("2025-04-26T07:47:00Z") },
  { userId: UID.austenMarwin, phoneNumber: "+919284638248", direction: "out", content: "🚨 Medical Alert for Austen Marwin Gomes:\n\nPlease inform the care team of the following BEFORE any procedure:\n\n1. 🧤 LATEX ALLERGY (confirmed IgE class 2) — request latex-free gloves, catheters, and equipment.\n2. 💊 NSAID HYPERSENSITIVITY — avoid Aspirin, Ibuprofen, Diclofenac, Ketorolac. Paracetamol is safe.\n3. 🅰️ Blood type: AB-\n4. 🌿 Active medications: Cetirizine 10 mg, Fluticasone Nasal Spray.\n\nYou can share your emergency token or show this message to the anaesthesiologist.", timestamp: new Date("2025-04-26T07:47:07Z") },
];

// ─────────────────────────────────────────────
// CHAT SESSIONS  (in-app AI chat)
// ─────────────────────────────────────────────
const CHAT_SESSIONS = [
  {
    userId: UID.chirag,
    title: "Understanding my HbA1c results",
    messages: [
      { role: "user",      content: "My HbA1c is 7.8%. Is that bad?",                                                                          sourceDocIds: [], timestamp: new Date("2025-04-20T10:00:00Z") },
      { role: "assistant", content: "An HbA1c of 7.8 % means your average blood sugar over the past 2–3 months is above the target range. For most adults with diabetes, the target is below 7 %. At 7.8 %, your diabetes is not well-controlled, which increases the risk of complications like kidney damage, nerve issues, and eye problems over time. Your doctor has started Metformin — make sure to take it consistently and follow a low-glycaemic diet.", sourceDocIds: [], timestamp: new Date("2025-04-20T10:00:03Z") },
      { role: "user",      content: "What foods should I avoid?",                                                                               sourceDocIds: [], timestamp: new Date("2025-04-20T10:01:00Z") },
      { role: "assistant", content: "Avoid foods that spike blood sugar quickly: white rice, white bread, sugary drinks, sweets, fruit juices, and fried snacks. Prefer whole grains (brown rice, oats, millets), non-starchy vegetables, lentils, and high-fibre foods. Eat at regular intervals and avoid large gaps between meals.",                                                                                                                     sourceDocIds: [], timestamp: new Date("2025-04-20T10:01:04Z") },
    ],
    createdAt: new Date("2025-04-20T10:00:00Z"),
  },
  {
    userId: UID.austenMarwin,
    title: "Latex allergy and upcoming surgery",
    messages: [
      { role: "user",      content: "I have a latex allergy. What should I tell the hospital before my operation?",                             sourceDocIds: [], timestamp: new Date("2025-04-22T15:00:00Z") },
      { role: "assistant", content: "This is very important. Tell every member of the team — surgeon, anaesthesiologist, and nurses — that you have a confirmed latex allergy (IgE class 2) before the procedure. Request a latex-free environment: gloves, surgical drapes, catheters, IV lines, and blood pressure cuffs must all be latex-free. Arrive first on the operating list if possible, as latex particles can accumulate in the air. Also remind them of your NSAID hypersensitivity for post-operative pain management — Paracetamol or opioids are usually safe alternatives.", sourceDocIds: [], timestamp: new Date("2025-04-22T15:00:05Z") },
    ],
    createdAt: new Date("2025-04-22T15:00:00Z"),
  },
];

// ─────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────
async function seed() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("✅  Connected to MongoDB Atlas");

    const db = client.db(DB_NAME);

    // Helper: drop & recreate
    async function resetAndInsert(collectionName, docs) {
      const col = db.collection(collectionName);
      await col.deleteMany({});
      if (docs.length > 0) {
        const result = await col.insertMany(docs);
        console.log(`📦  ${collectionName}: inserted ${result.insertedCount} docs`);
      }
    }

    await resetAndInsert("users",            USERS);
    await resetAndInsert("documents",         DOCUMENTS);
    await resetAndInsert("prescriptions",     PRESCRIPTIONS);
    await resetAndInsert("whatsappmessages",  WHATSAPP_MESSAGES);
    await resetAndInsert("chatsessions",      CHAT_SESSIONS);

    console.log("\n🎉  Seed complete! Collections in database:", DB_NAME);
    console.log("\nUsers seeded:");
    USERS.forEach(u => console.log(`  ${u.name.padEnd(28)} ${u.email.padEnd(40)} 📱 ${u.whatsappPhone}  _id → ${u._id}`));

    console.log("\n⚠️  Next steps:");
    console.log("  1. Have each person sign in with Google (Firebase) at least once.");
    console.log("  2. Copy each UID from Firebase Console → Authentication → Users.");
    console.log("  3. Re-run the seed with real UIDs so _id matches the auth token:\n");
    console.log("     UID_CHIRAG=xxx UID_MANAN=xxx UID_AUSTEN=xxx UID_AUSTEN_MARWIN=xxx node seed.js\n");
    console.log("  Email → UID env var mapping:");
    console.log("    simepurushkarchirag84@gmail.com  →  UID_CHIRAG");
    console.log("    mananchodankar77@gmail.com       →  UID_MANAN");
    console.log("    austengomes15@gmail.com          →  UID_AUSTEN");
    console.log("    austenmarwingomes@gmail.com      →  UID_AUSTEN_MARWIN");
  } catch (err) {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
