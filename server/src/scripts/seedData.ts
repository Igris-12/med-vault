/**
 * Seed script — populates MongoDB with realistic medical data.
 * Run: npx tsx src/scripts/seedData.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO = process.env.MONGODB_URI!;
const PATIENT_UID = process.env.SEED_PATIENT_UID || 'FIREBASE_UID_CHIRAG';
const DOCTOR_UID = process.env.SEED_DOCTOR_UID || 'FIREBASE_UID_AUSTEN';

// ── helpers ──
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const vec128 = () => Array.from({ length: 128 }, () => Math.random() * 2 - 1);

async function main() {
  await mongoose.connect(MONGO);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db!;

  // Clear old seed data
  for (const c of ['documents', 'prescriptions', 'chatsessions', 'whatsappmessages']) {
    await db.collection(c).deleteMany({ userId: { $in: [PATIENT_UID, DOCTOR_UID] } });
  }
  console.log('Cleared old data');

  // ════════════════════════════════════════
  // ═══ DOCUMENTS — CHIRAG (PATIENT) ═══
  // ════════════════════════════════════════
  const patientDocs = [

    // ── Blood / CBC ──
    mkDoc(PATIENT_UID, 'CBC Report - Jan 2024', 'lab_report', d(2024, 1, 15), 'Apollo Hospital, Mumbai', 'Dr. Priya Mehta',
      ['Anemia'], [{ name: 'Ferrous Ascorbate', dosage: '100mg', frequency: 'Once daily', duration: '3 months' }],
      [lv('Hemoglobin', '11.2', 'g/dL', '13-17', true), lv('RBC', '4.1', 'M/uL', '4.5-5.5', true), lv('WBC', '7200', 'cells/uL', '4000-11000', false), lv('Platelets', '245000', '/uL', '150000-400000', false), lv('MCV', '72', 'fL', '80-100', true), lv('MCH', '22', 'pg', '27-33', true)],
      'Your red blood cell count and hemoglobin are lower than normal, suggesting mild iron-deficiency anemia. Your white cells and platelets are fine.',
      'Microcytic hypochromic anemia pattern. Hb 11.2 g/dL, MCV 72 fL, MCH 22 pg. Likely iron deficiency. Recommend serum ferritin + iron studies.',
      6, ['anemia', 'hemoglobin', 'CBC']),

    mkDoc(PATIENT_UID, 'CBC Report - Jul 2024', 'lab_report', d(2024, 7, 20), 'Apollo Hospital, Mumbai', 'Dr. Priya Mehta',
      ['Anemia — improving'], [{ name: 'Ferrous Ascorbate', dosage: '100mg', frequency: 'Once daily', duration: '3 months' }, { name: 'Vitamin C', dosage: '500mg', frequency: 'Once daily', duration: '3 months' }],
      [lv('Hemoglobin', '12.8', 'g/dL', '13-17', true), lv('RBC', '4.4', 'M/uL', '4.5-5.5', true), lv('WBC', '6800', 'cells/uL', '4000-11000', false), lv('Platelets', '260000', '/uL', '150000-400000', false), lv('MCV', '78', 'fL', '80-100', true), lv('MCH', '25', 'pg', '27-33', true)],
      'Great news — your hemoglobin has improved from 11.2 to 12.8. Keep taking your iron supplements. Almost at the normal range!',
      'Hb 12.8 g/dL (↑1.6 vs Jan). MCV trending upward. Microcytosis resolving. Continue iron supplementation 3 more months.',
      4, ['anemia', 'hemoglobin', 'improving']),

    mkDoc(PATIENT_UID, 'CBC Report - Jan 2025', 'lab_report', d(2025, 1, 10), 'Apollo Hospital, Mumbai', 'Dr. Priya Mehta',
      [], [],
      [lv('Hemoglobin', '13.6', 'g/dL', '13-17', false), lv('RBC', '4.6', 'M/uL', '4.5-5.5', false), lv('WBC', '7000', 'cells/uL', '4000-11000', false), lv('Platelets', '270000', '/uL', '150000-400000', false), lv('MCV', '82', 'fL', '80-100', false), lv('MCH', '28', 'pg', '27-33', false)],
      'All blood count values are now in the normal range. Your anemia has fully resolved. No further iron supplements needed.',
      'CBC fully normalized. Hb 13.6 g/dL, MCV 82, MCH 28. Iron deficiency anemia resolved. Discontinue supplementation.',
      2, ['CBC', 'normal', 'resolved']),

    // ── Lipid ──
    mkDoc(PATIENT_UID, 'Lipid Panel - Mar 2024', 'lab_report', d(2024, 3, 10), 'Jupiter Hospital, Mumbai', 'Dr. Rohan Shah',
      ['Hyperlipidemia'], [{ name: 'Atorvastatin', dosage: '10mg', frequency: 'Once at bedtime', duration: '6 months' }],
      [lv('Total Cholesterol', '242', 'mg/dL', '<200', true), lv('LDL', '165', 'mg/dL', '<100', true), lv('HDL', '42', 'mg/dL', '>40', false), lv('Triglycerides', '198', 'mg/dL', '<150', true), lv('VLDL', '39', 'mg/dL', '<30', true)],
      'Your cholesterol is elevated. The bad (LDL) cholesterol and triglycerides are both high. Your doctor has started you on a cholesterol-lowering medicine.',
      'TC 242, LDL 165, TG 198, VLDL 39 — all above targets. HDL borderline. Atherogenic dyslipidemia pattern. Initiate statin therapy.',
      7, ['cholesterol', 'lipid', 'LDL', 'triglycerides']),

    mkDoc(PATIENT_UID, 'Lipid Panel - Sep 2024', 'lab_report', d(2024, 9, 5), 'Jupiter Hospital, Mumbai', 'Dr. Rohan Shah',
      ['Hyperlipidemia — improving'], [{ name: 'Atorvastatin', dosage: '10mg', frequency: 'Once at bedtime', duration: 'Ongoing' }],
      [lv('Total Cholesterol', '210', 'mg/dL', '<200', true), lv('LDL', '132', 'mg/dL', '<100', true), lv('HDL', '48', 'mg/dL', '>40', false), lv('Triglycerides', '155', 'mg/dL', '<150', true), lv('VLDL', '31', 'mg/dL', '<30', true)],
      'Your cholesterol has significantly improved with medication. LDL dropped from 165 to 132. HDL also improved. Keep taking Atorvastatin.',
      'TC 210 (↓32), LDL 132 (↓33), HDL 48 (↑6), TG 155 (↓43). Good response to statin therapy. LDL still above <100 target — consider up-titration.',
      5, ['cholesterol', 'improving', 'statin']),

    mkDoc(PATIENT_UID, 'Lipid Panel - Mar 2025', 'lab_report', d(2025, 3, 8), 'Jupiter Hospital, Mumbai', 'Dr. Rohan Shah',
      ['Hyperlipidemia — controlled'], [{ name: 'Atorvastatin', dosage: '20mg', frequency: 'Once at bedtime', duration: 'Ongoing' }],
      [lv('Total Cholesterol', '188', 'mg/dL', '<200', false), lv('LDL', '95', 'mg/dL', '<100', false), lv('HDL', '52', 'mg/dL', '>40', false), lv('Triglycerides', '128', 'mg/dL', '<150', false), lv('VLDL', '26', 'mg/dL', '<30', false)],
      'Excellent! Your cholesterol is now fully under control. LDL has reached the target of <100 after increasing your statin dose.',
      'Full lipid panel normalization. LDL 95 — at target. TC 188, TG 128, HDL 52. Continue Atorvastatin 20mg. Annual review.',
      2, ['cholesterol', 'normal', 'controlled']),

    // ── Thyroid ──
    mkDoc(PATIENT_UID, 'Thyroid Profile - Feb 2024', 'lab_report', d(2024, 2, 18), 'SRL Diagnostics', 'Dr. Anita Kulkarni',
      ['Subclinical Hypothyroidism'], [{ name: 'Levothyroxine', dosage: '50mcg', frequency: 'Morning on empty stomach', duration: 'Ongoing' }],
      [lv('TSH', '6.8', 'mIU/L', '0.4-4.0', true), lv('Free T4', '0.9', 'ng/dL', '0.8-1.8', false), lv('Free T3', '2.4', 'pg/mL', '2.3-4.2', false), lv('Anti-TPO', '48', 'IU/mL', '<35', true)],
      'Your thyroid stimulating hormone (TSH) is elevated, which means your thyroid is underactive. Your T4 and T3 levels are still normal. Doctor has started you on Levothyroxine.',
      'TSH 6.8 mIU/L (elevated). FT4 and FT3 within limits — subclinical hypothyroidism. Anti-TPO 48 — possible early Hashimoto thyroiditis. Start Levothyroxine 50mcg.',
      5, ['thyroid', 'TSH', 'hypothyroidism']),

    mkDoc(PATIENT_UID, 'Thyroid Profile - Aug 2024', 'lab_report', d(2024, 8, 12), 'SRL Diagnostics', 'Dr. Anita Kulkarni',
      ['Hypothyroidism'], [{ name: 'Levothyroxine', dosage: '50mcg', frequency: 'Morning on empty stomach', duration: 'Ongoing' }],
      [lv('TSH', '4.2', 'mIU/L', '0.4-4.0', true), lv('Free T4', '1.1', 'ng/dL', '0.8-1.8', false), lv('Free T3', '2.8', 'pg/mL', '2.3-4.2', false)],
      'Your TSH has come down significantly from 6.8 to 4.2. Almost in the normal range. Continue your thyroid medication.',
      'TSH 4.2 (↓2.6 vs Feb). Near-optimal range. FT4 1.1 — normal. Continue Levothyroxine 50mcg unchanged. Recheck in 6 months.',
      3, ['thyroid', 'improving']),

    mkDoc(PATIENT_UID, 'Thyroid Profile - Feb 2025', 'lab_report', d(2025, 2, 14), 'SRL Diagnostics', 'Dr. Anita Kulkarni',
      ['Hypothyroidism — controlled'], [{ name: 'Levothyroxine', dosage: '50mcg', frequency: 'Morning on empty stomach', duration: 'Ongoing' }],
      [lv('TSH', '2.1', 'mIU/L', '0.4-4.0', false), lv('Free T4', '1.3', 'ng/dL', '0.8-1.8', false), lv('Free T3', '3.1', 'pg/mL', '2.3-4.2', false)],
      'Your thyroid is now well controlled. TSH is in the ideal range. Continue your Levothyroxine as prescribed.',
      'TSH 2.1 — optimal. FT4 1.3, FT3 3.1 — both normal. Euthyroid on Levothyroxine 50mcg. Annual monitoring.',
      2, ['thyroid', 'normal', 'controlled']),

    // ── HbA1c / Diabetes ──
    mkDoc(PATIENT_UID, 'HbA1c - Apr 2024', 'lab_report', d(2024, 4, 22), 'Metropolis Labs', 'Dr. Vijay Desai',
      ['Type 2 Diabetes Mellitus'], [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', duration: '6 months' }],
      [lv('HbA1c', '7.2', '%', '<5.7', true), lv('Fasting Glucose', '142', 'mg/dL', '70-100', true), lv('Post-prandial Glucose', '198', 'mg/dL', '<140', true), lv('Fasting Insulin', '18', 'µIU/mL', '3-25', false)],
      'Your blood sugar (HbA1c 7.2%) shows moderate diabetes. Fasting sugar is also elevated. Metformin has been started to help control it.',
      'HbA1c 7.2%, FBS 142, PPBS 198 — T2DM suboptimal control. Insulin secretion adequate. Initiate Metformin 500mg BD.',
      7, ['diabetes', 'HbA1c', 'glucose']),

    mkDoc(PATIENT_UID, 'HbA1c - Oct 2024', 'lab_report', d(2024, 10, 8), 'Metropolis Labs', 'Dr. Vijay Desai',
      ['Type 2 Diabetes Mellitus'], [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', duration: 'Ongoing' }],
      [lv('HbA1c', '6.5', '%', '<5.7', true), lv('Fasting Glucose', '118', 'mg/dL', '70-100', true), lv('Post-prandial Glucose', '158', 'mg/dL', '<140', true)],
      'Your HbA1c has improved from 7.2% to 6.5%. This is getting close to the diabetic target of <7%. Metformin is working well.',
      'HbA1c 6.5% (↓0.7). FBS 118, PPBS 158. Approaching target. Continue Metformin. Reinforce dietary and lifestyle measures.',
      5, ['diabetes', 'improving', 'HbA1c']),

    mkDoc(PATIENT_UID, 'HbA1c - Apr 2025', 'lab_report', d(2025, 4, 5), 'Metropolis Labs', 'Dr. Vijay Desai',
      ['Type 2 Diabetes Mellitus — controlled'], [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', duration: 'Ongoing' }],
      [lv('HbA1c', '6.1', '%', '<5.7', true), lv('Fasting Glucose', '102', 'mg/dL', '70-100', true), lv('Post-prandial Glucose', '138', 'mg/dL', '<140', false)],
      'Your diabetes is well-controlled. HbA1c is now 6.1% which is very close to the target. Fasting sugar is almost normal.',
      'HbA1c 6.1% — excellent glycemic control. FBS borderline. PPBS within target. Continue current regimen. Annual ophthalmology & nephrology screening.',
      3, ['diabetes', 'controlled', 'HbA1c']),

    // ── Vitamins ──
    mkDoc(PATIENT_UID, 'Vitamin D & B12 - May 2024', 'lab_report', d(2024, 5, 14), 'Thyrocare', 'Dr. Amit Joshi',
      ['Vitamin D Deficiency'], [{ name: 'Vitamin D3', dosage: '60000 IU', frequency: 'Once weekly', duration: '8 weeks' }, { name: 'Calcium Carbonate', dosage: '500mg', frequency: 'Twice daily', duration: '3 months' }],
      [lv('Vitamin D (25-OH)', '12.5', 'ng/mL', '30-100', true), lv('Vitamin B12', '380', 'pg/mL', '200-900', false), lv('Calcium', '8.6', 'mg/dL', '8.5-10.5', false), lv('Phosphorus', '3.4', 'mg/dL', '2.5-4.5', false)],
      'Your Vitamin D level is very low at 12.5 (normal is 30+). This can cause fatigue, joint pains, and mood changes. Weekly high-dose Vitamin D3 has been prescribed.',
      '25-OH Vitamin D 12.5 ng/mL — severe deficiency. B12 and calcium within limits. Start Vitamin D3 60,000 IU/week × 8 weeks, then monthly maintenance.',
      6, ['vitamin D', 'deficiency', 'fatigue']),

    mkDoc(PATIENT_UID, 'Vitamin D & B12 - Nov 2024', 'lab_report', d(2024, 11, 10), 'Thyrocare', 'Dr. Amit Joshi',
      [], [{ name: 'Vitamin D3', dosage: '60000 IU', frequency: 'Once monthly', duration: 'Ongoing' }],
      [lv('Vitamin D (25-OH)', '38.4', 'ng/mL', '30-100', false), lv('Vitamin B12', '412', 'pg/mL', '200-900', false)],
      'Your Vitamin D has reached the normal range (38.4)! Continue the monthly maintenance dose. B12 is also good.',
      '25-OH Vitamin D 38.4 — replete. B12 412 — normal. Switch to monthly maintenance Vitamin D3 60,000 IU.',
      2, ['vitamin D', 'normal', 'replete']),

    // ── Kidney / Liver ──
    mkDoc(PATIENT_UID, 'KFT + LFT - Jun 2024', 'lab_report', d(2024, 6, 3), 'Apollo Hospital, Mumbai', 'Dr. Priya Mehta',
      [], [{ name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: 'Ongoing' }, { name: 'Pantoprazole', dosage: '40mg', frequency: 'Before breakfast', duration: '3 months' }],
      [lv('Creatinine', '0.9', 'mg/dL', '0.7-1.3', false), lv('BUN', '18', 'mg/dL', '7-20', false), lv('eGFR', '95', 'mL/min/1.73m²', '≥60', false), lv('Uric Acid', '6.2', 'mg/dL', '3.5-7.0', false),
      lv('SGOT/AST', '28', 'U/L', '10-40', false), lv('SGPT/ALT', '35', 'U/L', '7-56', false), lv('Total Bilirubin', '0.8', 'mg/dL', '0.1-1.2', false), lv('Albumin', '4.2', 'g/dL', '3.5-5.0', false), lv('ALP', '72', 'U/L', '44-147', false)],
      'Your kidney and liver tests are completely normal. No organ damage from your medications.',
      'KFT: Creatinine 0.9, eGFR 95 — stage G1 (normal). LFT: All parameters within reference. No drug-induced hepatotoxicity or nephrotoxicity.',
      2, ['kidney', 'liver', 'normal', 'KFT', 'LFT']),

    mkDoc(PATIENT_UID, 'KFT + LFT - Dec 2024', 'lab_report', d(2024, 12, 15), 'Apollo Hospital, Mumbai', 'Dr. Priya Mehta',
      [], [],
      [lv('Creatinine', '0.95', 'mg/dL', '0.7-1.3', false), lv('BUN', '16', 'mg/dL', '7-20', false), lv('eGFR', '92', 'mL/min/1.73m²', '≥60', false), lv('Uric Acid', '6.0', 'mg/dL', '3.5-7.0', false),
      lv('SGOT/AST', '30', 'U/L', '10-40', false), lv('SGPT/ALT', '38', 'U/L', '7-56', false), lv('Total Bilirubin', '0.75', 'mg/dL', '0.1-1.2', false), lv('Albumin', '4.4', 'g/dL', '3.5-5.0', false)],
      'Kidney and liver function remain normal. All values stable compared to June.',
      'KFT & LFT stable. eGFR 92 — no CKD progression. Hepatic panel normal. Continue current medications.',
      2, ['kidney', 'liver', 'stable']),

    // ── Urine ──
    mkDoc(PATIENT_UID, 'Urine Routine - Jun 2024', 'lab_report', d(2024, 6, 3), 'Apollo Hospital, Mumbai', 'Dr. Priya Mehta',
      [], [],
      [lv('Protein', 'Nil', '', 'Nil', false), lv('Glucose (urine)', 'Trace', '+', 'Nil', true), lv('RBCs', '0-1', '/hpf', '0-2', false), lv('WBCs', '2-3', '/hpf', '0-5', false)],
      'Urine shows a trace of sugar which can happen in diabetes. Protein is absent which means no kidney damage.',
      'Urinalysis: Trace glycosuria consistent with diabetes. Proteinuria absent — no microalbuminuria. No pyuria or haematuria.',
      3, ['urine', 'glycosuria', 'diabetes']),

    // ── Cardiac / ECG ──
    mkDoc(PATIENT_UID, 'ECG Report - Nov 2024', 'lab_report', d(2024, 11, 20), 'Apollo Hospital, Mumbai', 'Dr. Rohan Shah',
      ['Hypertension'], [{ name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily at night', duration: 'Ongoing' }],
      [],
      'Your ECG (heart tracing) is normal. Normal heart rate and rhythm. No signs of heart strain.',
      'NSR at 72 bpm. Normal PR, QRS, QTc intervals. No ST-T changes. No LVH. No ischemic pattern.',
      2, ['ECG', 'normal', 'heart']),

    mkDoc(PATIENT_UID, 'Echocardiogram - Mar 2025', 'imaging', d(2025, 3, 18), 'Jupiter Hospital, Mumbai', 'Dr. Rohan Shah',
      ['Hypertension'], [],
      [],
      'Your heart ultrasound is normal. Pumping function (EF 62%) is good. No valve problems detected.',
      '2D Echo: EF 62% — preserved. Normal LV dimensions. No wall motion abnormality. Mild concentric LVH. Valves structurally normal. No pericardial effusion.',
      3, ['echo', 'cardiac', 'EF', 'LVH']),

    // ── Imaging ──
    mkDoc(PATIENT_UID, 'Chest X-Ray - Dec 2024', 'imaging', d(2024, 12, 1), 'SRL Diagnostics', 'Dr. Anita Kulkarni',
      [], [],
      [],
      'Normal chest X-ray. Lungs are clear. Heart size is normal.',
      'PA view: Clear lung fields bilaterally. No consolidation, effusion, or pneumothorax. Normal cardiac silhouette (CTR 0.48). Intact bony thorax.',
      2, ['X-ray', 'chest', 'normal']),

    mkDoc(PATIENT_UID, 'Abdominal Ultrasound - Jan 2025', 'imaging', d(2025, 1, 8), 'Jupiter Hospital, Mumbai', 'Dr. Sunita Patil',
      ['Grade 1 Fatty Liver'], [],
      [],
      'Your liver scan shows mild fatty liver (Grade 1). This is common in diabetes and high cholesterol. Your gallbladder, kidneys, spleen and pancreas are all normal.',
      'USG abdomen: Grade 1 hepatic steatosis — correlate with LFT and lipid profile. GB, spleen, pancreas, bilateral kidneys unremarkable. No focal lesions.',
      4, ['ultrasound', 'fatty liver', 'steatosis']),

    // ── Discharge Summary ──
    mkDoc(PATIENT_UID, 'Discharge Summary - Appendectomy', 'discharge_summary', d(2025, 1, 5), 'Jupiter Hospital, Mumbai', 'Dr. Sunita Patil',
      ['Acute Appendicitis'], [{ name: 'Amoxicillin-Clavulanate', dosage: '625mg', frequency: 'Twice daily', duration: '5 days' }, { name: 'Paracetamol', dosage: '650mg', frequency: 'Three times daily if needed', duration: '3 days' }],
      [],
      'You were admitted for an inflamed appendix and had a keyhole surgery (laparoscopic appendectomy). The operation went smoothly and you were discharged after 2 days. Follow up in 1 week.',
      'Admitted: 03/01/2025. Dx: Acute appendicitis. Procedure: Lap appendectomy under GA. Intraop: Uncomplicated. Post-op: Uneventful. D/C: 05/01/2025. F/U: 1 week.',
      7, ['surgery', 'appendectomy', 'discharge']),

    // ── Vaccinations ──
    mkDoc(PATIENT_UID, 'Vaccination Record - 2024', 'vaccination', d(2024, 10, 15), 'Apollo Hospital, Mumbai', 'Dr. Priya Mehta',
      [], [],
      [],
      'Flu vaccine (Influenza) and Covid-19 booster administered. Both tolerated well with no adverse reactions.',
      'Influenza vaccine (Quadrivalent) administered IM. COVID-19 XBB.1.5 booster administered. No immediate adverse reactions noted.',
      1, ['vaccination', 'flu', 'covid']),

    // ── Prescriptions as documents ──
    mkDoc(PATIENT_UID, 'Prescription - Dr. Desai Apr 2024', 'prescription', d(2024, 4, 22), 'Metropolis Clinic', 'Dr. Vijay Desai',
      ['Type 2 Diabetes Mellitus', 'Hypertension', 'GERD'],
      [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily with meals', duration: '6 months' },
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily at night', duration: 'Ongoing' },
      { name: 'Pantoprazole', dosage: '40mg', frequency: 'Before breakfast', duration: '3 months' }],
      [],
      'Prescription for managing your diabetes, blood pressure, and acidity. Take medicines as directed and follow up in 3 months.',
      'Multi-drug prescription: Metformin for T2DM, Amlodipine for hypertension, Pantoprazole for GERD. Lifestyle modification counselling done.',
      4, ['prescription', 'diabetes', 'hypertension', 'GERD']),

    mkDoc(PATIENT_UID, 'Prescription - Dr. Shah Sep 2024', 'prescription', d(2024, 9, 5), 'Jupiter Clinic', 'Dr. Rohan Shah',
      ['Hyperlipidemia', 'Hypertension'],
      [{ name: 'Atorvastatin', dosage: '20mg', frequency: 'Once at bedtime', duration: 'Ongoing' },
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily at night', duration: 'Ongoing' },
      { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily after breakfast', duration: 'Ongoing' }],
      [],
      'Updated prescription for cholesterol and blood pressure. Statin dose increased. Aspirin added for heart protection.',
      'Atorvastatin uptitrated to 20mg. Aspirin 75mg added for primary CV risk reduction in patient with DM + HTN + dyslipidemia.',
      4, ['prescription', 'cholesterol', 'aspirin', 'cardioprotection']),

    mkDoc(PATIENT_UID, 'Prescription - Post Surgery Jan 2025', 'prescription', d(2025, 1, 5), 'Jupiter Hospital, Mumbai', 'Dr. Sunita Patil',
      ['Post Appendectomy', 'Surgical Site Infection Prophylaxis'],
      [{ name: 'Amoxicillin-Clavulanate', dosage: '625mg', frequency: 'Twice daily', duration: '5 days' },
      { name: 'Paracetamol', dosage: '650mg', frequency: 'Three times daily SOS', duration: '3 days' },
      { name: 'Lactulose', dosage: '10mL', frequency: 'Once daily at night', duration: '5 days' }],
      [],
      'Post-surgery medicines to prevent infection and manage pain. Eat soft food for 2 weeks. Avoid heavy lifting for 6 weeks.',
      'Post lap appendectomy discharge prescription. Antibiotics for surgical prophylaxis, analgesia, stool softener to avoid straining.',
      3, ['prescription', 'post-op', 'surgery']),

    // ── Consultation notes ──
    mkDoc(PATIENT_UID, 'Consultation - Endocrinology Review Aug 2024', 'consultation', d(2024, 8, 25), 'KEM Hospital, Mumbai', 'Dr. Meera Iyer',
      ['Type 2 Diabetes Mellitus', 'Hypothyroidism'],
      [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: 'Continue' }, { name: 'Levothyroxine', dosage: '50mcg', frequency: 'Morning', duration: 'Continue' }],
      [],
      'Endocrinology review: diabetes and thyroid are both showing improvement. Lifestyle changes are working. Continue current medicines and recheck in 6 months.',
      'Endocrinology OPD: T2DM — HbA1c trend improving (7.2 → 6.5). Hypothyroidism on replacement — TSH trending to target. No medication change required. Retinal screening ordered.',
      3, ['consultation', 'endocrinology', 'diabetes', 'thyroid']),

    mkDoc(PATIENT_UID, 'Consultation - Cardiology Nov 2024', 'consultation', d(2024, 11, 22), 'Jupiter Hospital, Mumbai', 'Dr. Rohan Shah',
      ['Hypertension', 'Hyperlipidemia'],
      [{ name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: 'Continue' }, { name: 'Atorvastatin', dosage: '20mg', frequency: 'Bedtime', duration: 'Continue' }, { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: 'Continue' }],
      [],
      'Cardiology review: Blood pressure is well controlled. ECG and Echo are normal. Continue current heart medicines. Come back in 6 months.',
      'Cardiology OPD: BP 128/82 mmHg — controlled on Amlodipine. ECG NSR. 2D Echo scheduled. Lipid target approaching. Continue current regimen.',
      3, ['consultation', 'cardiology', 'hypertension', 'BP']),

  ]; // end patientDocs

  // ════════════════════════════════════════
  // ═══ DOCUMENTS — AUSTEN (DOCTOR) ═══
  // ════════════════════════════════════════
  const doctorDocs = [
    mkDoc(DOCTOR_UID, 'Patient Referral - Mr. Rajan Iyer - Cardiology', 'consultation', d(2024, 5, 10), 'City Multi-Speciality Hospital', 'Dr. Austen Gomes',
      ['Chest pain on exertion', 'Hypertension'], [],
      [],
      'Patient referred to cardiology for chest pain evaluation. TMT and 2D Echo recommended.',
      'Ref: 45M c/o exertional chest pain × 2 weeks. ECG — T-wave flattening V4-V6. Refer cardiology for TMT + 2D Echo. Provisional: Stable angina vs GERD.',
      5, ['referral', 'cardiology', 'chest pain']),

    mkDoc(DOCTOR_UID, 'Clinical Notes - Diabetes Review - Mrs. Sharma', 'consultation', d(2024, 8, 15), 'City Multi-Speciality Hospital', 'Dr. Austen Gomes',
      ['Type 2 Diabetes Mellitus'], [{ name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily', duration: 'Continue' }],
      [lv('HbA1c', '7.9', '%', '<7.0', true), lv('Fasting Glucose', '168', 'mg/dL', '70-100', true)],
      'Diabetic follow-up — HbA1c not at target. Metformin dose increased. Diet counselling done.',
      'T2DM follow-up: HbA1c 7.9% — above target. Uptitrate Metformin to 1000mg BD. Refer dietician. RFT at 3 months.',
      6, ['diabetes', 'HbA1c', 'metformin', 'follow-up']),

    mkDoc(DOCTOR_UID, 'Discharge Summary - Mrs. Patel - Pneumonia', 'discharge_summary', d(2024, 9, 20), 'City Multi-Speciality Hospital', 'Dr. Austen Gomes',
      ['Community-acquired Pneumonia'], [{ name: 'Amoxicillin-Clavulanate', dosage: '625mg', frequency: 'Twice daily', duration: '7 days' }, { name: 'Azithromycin', dosage: '500mg', frequency: 'Once daily', duration: '5 days' }],
      [lv('WBC', '14800', 'cells/uL', '4000-11000', true), lv('CRP', '48', 'mg/L', '<10', true), lv('SpO2', '94', '%', '≥95', true)],
      'Patient discharged after 4 days of treatment for pneumonia. Breathing improved. Continue antibiotics for 7 days at home.',
      'Admitted: 16/09/2024. Dx: CAP — moderate severity (CURB-65: 1). IV Cefuroxime + Azithromycin × 3d → oral step-down. CXR clearing. SpO2 98% on RA at discharge.',
      6, ['discharge', 'pneumonia', 'antibiotics']),

    mkDoc(DOCTOR_UID, 'Referral - Mr. Fernandes - Nephrology', 'consultation', d(2024, 10, 5), 'City Multi-Speciality Hospital', 'Dr. Austen Gomes',
      ['CKD Stage 3', 'Hypertension', 'Diabetes'], [{ name: 'Losartan', dosage: '50mg', frequency: 'Once daily', duration: 'Continue' }],
      [lv('Creatinine', '2.1', 'mg/dL', '0.7-1.3', true), lv('eGFR', '38', 'mL/min/1.73m²', '≥60', true), lv('Urine Albumin:Creatinine', '85', 'mg/g', '<30', true)],
      'Patient referred to nephrology for worsening kidney function. Current kidney function is at 38% (CKD Stage 3).',
      'Ref nephrology: CKD Stage 3b. eGFR 38, ACR 85 — macroalbuminuria. Continue RAAS blockade. Avoid NSAIDs. Low-protein diet counselling.',
      8, ['CKD', 'nephrology', 'referral', 'kidney']),

    mkDoc(DOCTOR_UID, 'OPD Notes - Paediatric Visit - Master Arjun 8yr', 'consultation', d(2024, 11, 12), 'City Multi-Speciality Hospital', 'Dr. Austen Gomes',
      ['Acute Tonsillitis'], [{ name: 'Amoxicillin', dosage: '250mg', frequency: 'Three times daily', duration: '5 days' }, { name: 'Paracetamol syrup', dosage: '5mL', frequency: 'Three times daily SOS', duration: '3 days' }],
      [lv('Temperature', '101.4', '°F', '97-99', true), lv('Throat Swab', 'Strep positive', '', 'Negative', true)],
      'Child has throat infection caused by Strep bacteria. Antibiotics prescribed for 5 days. Fever medicine as needed. Rest and fluids advised.',
      'Paed OPD: 8M. Acute tonsillitis. Rapid strep antigen positive. Start Amoxicillin 250mg TID × 5d. Antipyretic SOS. Review if no improvement in 48h.',
      4, ['paediatrics', 'tonsillitis', 'strep', 'antibiotics']),

    mkDoc(DOCTOR_UID, 'Clinical Notes - Asthma Management - Mr. Sawant', 'consultation', d(2024, 12, 3), 'City Multi-Speciality Hospital', 'Dr. Austen Gomes',
      ['Bronchial Asthma — Moderate Persistent'], [{ name: 'Budesonide-Formoterol inhaler', dosage: '200/6mcg', frequency: 'Twice daily', duration: 'Ongoing' }, { name: 'Salbutamol inhaler', dosage: '100mcg', frequency: 'As needed (rescue)', duration: 'Ongoing' }],
      [lv('Peak Flow', '68', '% predicted', '≥80%', true), lv('SpO2', '97', '%', '≥95', false)],
      'Asthma not fully controlled. Inhaler technique checked and corrected. Daily controller inhaler is essential — do not skip.',
      'Asthma OPD: Moderate persistent, partly controlled. GINA Step 3. PFR 68% predicted. Inhaler technique corrected. SABA usage 3×/week — add ICS/LABA.',
      5, ['asthma', 'inhaler', 'GINA', 'respiratory']),

    mkDoc(DOCTOR_UID, 'Discharge Summary - Mr. Kumar - STEMI', 'discharge_summary', d(2025, 1, 18), 'City Multi-Speciality Hospital', 'Dr. Austen Gomes',
      ['Acute STEMI — Anterior Wall', 'Hypertension', 'Type 2 Diabetes'],
      [{ name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: 'Lifelong' },
      { name: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily', duration: '12 months' },
      { name: 'Atorvastatin', dosage: '80mg', frequency: 'At bedtime', duration: 'Lifelong' },
      { name: 'Bisoprolol', dosage: '2.5mg', frequency: 'Once daily', duration: 'Lifelong' },
      { name: 'Ramipril', dosage: '2.5mg', frequency: 'Once daily', duration: 'Lifelong' }],
      [lv('Troponin I', '48.2', 'ng/mL', '<0.04', true), lv('CK-MB', '188', 'U/L', '<25', true), lv('EF post PCI', '45', '%', '≥55', true)],
      'Patient had a heart attack in the front wall of the heart. Emergency angioplasty was done successfully. Started on 5 lifelong heart medicines. Cardiac rehab recommended.',
      'Admitted: Anterior STEMI. Primary PCI — LAD stenting (DES). Post-PCI EF 45%. DAPT initiated. High-intensity statin, beta-blocker, ACEi started. Cardiac rehab referral.',
      9, ['STEMI', 'PCI', 'MI', 'cardiac', 'discharge']),

    mkDoc(DOCTOR_UID, 'Referral Letter - Ms. Nair - Psychiatry', 'consultation', d(2025, 2, 10), 'City Multi-Speciality Hospital', 'Dr. Austen Gomes',
      ['Major Depressive Disorder', 'Hypothyroidism'], [{ name: 'Escitalopram', dosage: '10mg', frequency: 'Once daily at night', duration: '3 months' }],
      [],
      'Patient referred to psychiatry for depression. Currently on antidepressant started by GP. Thyroid levels to be checked as a contributing factor.',
      'Ref psychiatry: 34F. PHQ-9 score 16 — moderate-severe depression. Hypothyroidism excluded (TSH normal). Started Escitalopram 10mg. Psychiatry for CBT + medication review.',
      6, ['psychiatry', 'depression', 'MDD', 'referral']),

    mkDoc(DOCTOR_UID, 'OPD Notes - Hypertension Review - Mr. D\'Souza', 'consultation', d(2025, 3, 5), 'City Multi-Speciality Hospital', 'Dr. Austen Gomes',
      ['Essential Hypertension'], [{ name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily morning', duration: 'Ongoing' }, { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: 'Ongoing' }],
      [lv('BP', '148/96', 'mmHg', '<130/80', true), lv('HR', '78', 'bpm', '60-100', false)],
      'Blood pressure is still above the target. A second blood pressure medicine (Amlodipine) has been added. Come back in 4 weeks for BP check.',
      'HTN OPD: BP 148/96 on Telmisartan 40mg. Uncontrolled. Add Amlodipine 5mg OD. Lifestyle — reduce salt, increase exercise. F/U 4 weeks.',
      5, ['hypertension', 'BP', 'ARB', 'CCB']),

    mkDoc(DOCTOR_UID, 'OPD Notes - Annual Review - Ms. Almeida', 'consultation', d(2025, 4, 2), 'City Multi-Speciality Hospital', 'Dr. Austen Gomes',
      ['Well woman check — all normal'], [],
      [lv('BMI', '23.4', 'kg/m²', '18.5-24.9', false), lv('BP', '118/74', 'mmHg', '<130/80', false), lv('Fasting Glucose', '88', 'mg/dL', '70-100', false), lv('Total Cholesterol', '172', 'mg/dL', '<200', false)],
      'Annual health check completely normal. BMI, blood pressure, sugar, and cholesterol all in range. Pap smear and mammogram recommended as screening.',
      'Annual preventive health review: 38F. All vitals and metabolic parameters within reference. BMI 23.4. Cervical cytology and mammography ordered per screening protocol.',
      1, ['annual review', 'normal', 'preventive']),
  ]; // end doctorDocs

  const allDocs = [...patientDocs, ...doctorDocs];
  await db.collection('documents').insertMany(allDocs);
  console.log(`Inserted ${allDocs.length} documents`);

  // ════════════════════════════════════════
  // ═══ PRESCRIPTIONS — CHIRAG ═══
  // ════════════════════════════════════════
  const rxs = [
    mkRx(PATIENT_UID, 'Metformin', '500mg', 'Twice daily with meals', 'Dr. Vijay Desai', d(2024, 4, 22), 'active', ['May deplete Vitamin B12 with long-term use'], 'mild'),
    mkRx(PATIENT_UID, 'Amlodipine', '5mg', 'Once daily at night', 'Dr. Rohan Shah', d(2024, 3, 10), 'active', [], 'none'),
    mkRx(PATIENT_UID, 'Atorvastatin', '20mg', 'Once at bedtime', 'Dr. Rohan Shah', d(2024, 9, 5), 'active', ['Avoid grapefruit juice — increases statin levels'], 'mild'),
    mkRx(PATIENT_UID, 'Levothyroxine', '50mcg', 'Morning on empty stomach', 'Dr. Anita Kulkarni', d(2024, 2, 18), 'active', ['Avoid calcium/iron supplements within 4h'], 'mild'),
    mkRx(PATIENT_UID, 'Pantoprazole', '40mg', 'Before breakfast daily', 'Dr. Vijay Desai', d(2024, 4, 22), 'discontinued', [], 'none'),
    mkRx(PATIENT_UID, 'Vitamin D3', '60000 IU', 'Once monthly', 'Dr. Amit Joshi', d(2024, 5, 14), 'active', [], 'none'),
    mkRx(PATIENT_UID, 'Ferrous Ascorbate', '100mg', 'Once daily after lunch', 'Dr. Priya Mehta', d(2024, 1, 15), 'discontinued', ['Avoid tea/coffee 1h around dose'], 'mild'),
    mkRx(PATIENT_UID, 'Aspirin', '75mg', 'Once daily after breakfast', 'Dr. Rohan Shah', d(2024, 9, 5), 'active', ['Avoid NSAIDs like Ibuprofen with Aspirin', 'Increased bleeding risk'], 'moderate'),
    mkRx(PATIENT_UID, 'Cetirizine', '10mg', 'At night as needed', 'Dr. Priya Mehta', d(2024, 6, 1), 'active', ['May cause drowsiness — avoid driving'], 'mild'),
    mkRx(PATIENT_UID, 'Amoxicillin-Clavulanate', '625mg', 'Twice daily with food', 'Dr. Sunita Patil', d(2025, 1, 5), 'discontinued', ['Avoid in Penicillin allergy'], 'none'),
    mkRx(PATIENT_UID, 'Paracetamol', '650mg', 'Three times daily SOS', 'Dr. Sunita Patil', d(2025, 1, 5), 'discontinued', [], 'none'),
    mkRx(PATIENT_UID, 'Calcium Carbonate', '500mg', 'Twice daily after meals', 'Dr. Amit Joshi', d(2024, 5, 14), 'active', ['Take 4h away from Levothyroxine'], 'mild'),
  ];

  // Doctor's prescriptions (for patients he manages)
  const doctorRxs = [
    mkRx(DOCTOR_UID, 'Metformin', '1000mg', 'Twice daily', 'Dr. Austen Gomes', d(2024, 8, 15), 'active', [], 'none'),
    mkRx(DOCTOR_UID, 'Amoxicillin-Clavulanate', '625mg', 'Twice daily', 'Dr. Austen Gomes', d(2024, 9, 16), 'discontinued', [], 'none'),
    mkRx(DOCTOR_UID, 'Azithromycin', '500mg', 'Once daily', 'Dr. Austen Gomes', d(2024, 9, 16), 'discontinued', ['Avoid with QT-prolonging drugs'], 'moderate'),
    mkRx(DOCTOR_UID, 'Aspirin', '75mg', 'Once daily', 'Dr. Austen Gomes', d(2025, 1, 18), 'active', ['Increased bleeding risk with Clopidogrel'], 'moderate'),
    mkRx(DOCTOR_UID, 'Clopidogrel', '75mg', 'Once daily', 'Dr. Austen Gomes', d(2025, 1, 18), 'active', ['Avoid Omeprazole — reduces efficacy', 'Increased bleeding with Aspirin'], 'moderate'),
    mkRx(DOCTOR_UID, 'Atorvastatin', '80mg', 'At bedtime', 'Dr. Austen Gomes', d(2025, 1, 18), 'active', ['Avoid grapefruit juice'], 'mild'),
    mkRx(DOCTOR_UID, 'Bisoprolol', '2.5mg', 'Once daily', 'Dr. Austen Gomes', d(2025, 1, 18), 'active', ['Do not stop abruptly — taper dose'], 'moderate'),
    mkRx(DOCTOR_UID, 'Ramipril', '2.5mg', 'Once daily', 'Dr. Austen Gomes', d(2025, 1, 18), 'active', ['Monitor K+ and creatinine in 1 week'], 'mild'),
    mkRx(DOCTOR_UID, 'Escitalopram', '10mg', 'Once daily night', 'Dr. Austen Gomes', d(2025, 2, 10), 'active', ['Takes 4-6 weeks for full effect', 'Avoid abrupt discontinuation'], 'mild'),
    mkRx(DOCTOR_UID, 'Telmisartan', '40mg', 'Once daily morning', 'Dr. Austen Gomes', d(2025, 3, 5), 'active', ['Monitor renal function'], 'mild'),
    mkRx(DOCTOR_UID, 'Budesonide-Formoterol', '200/6mcg', 'Twice daily inhaled', 'Dr. Austen Gomes', d(2024, 12, 3), 'active', ['Rinse mouth after each use to prevent oral thrush'], 'mild'),
    mkRx(DOCTOR_UID, 'Salbutamol', '100mcg', 'As needed (rescue)', 'Dr. Austen Gomes', d(2024, 12, 3), 'active', ['Overuse >3×/week indicates poor asthma control'], 'mild'),
  ];

  await db.collection('prescriptions').insertMany([...rxs, ...doctorRxs]);
  console.log(`Inserted ${rxs.length + doctorRxs.length} prescriptions`);

  // ════════════════════════════════════════
  // ═══ CHAT SESSIONS — CHIRAG ═══
  // ════════════════════════════════════════
  const chats = [
    {
      userId: PATIENT_UID,
      title: 'Understanding my cholesterol results',
      messages: [
        { role: 'user', content: 'What do my latest cholesterol numbers look like?', sourceDocIds: [], timestamp: d(2024, 9, 10) },
        { role: 'assistant', content: 'Your September 2024 lipid panel shows significant improvement! Here\'s the comparison:\n\n**March 2024 → September 2024**\n- Total Cholesterol: 242 → 210 mg/dL ✅ (↓32)\n- LDL (bad): 165 → 132 mg/dL ✅ (↓33)\n- HDL (good): 42 → 48 mg/dL ✅ (↑6)\n- Triglycerides: 198 → 155 mg/dL ✅ (↓43)\n\nAtorvastatin is clearly working well. However, LDL is still above the ideal <100 mg/dL target for diabetic patients. Your doctor increased the dose to 20mg — keep it up!', sourceDocIds: [], timestamp: d(2024, 9, 10) },
        { role: 'user', content: 'Is fatty liver related to my cholesterol?', sourceDocIds: [], timestamp: d(2024, 9, 10) },
        { role: 'assistant', content: 'Yes, absolutely. Your January 2025 ultrasound showed Grade 1 fatty liver (hepatic steatosis), which is directly linked to elevated triglycerides and cholesterol. The good news is Grade 1 is mild and fully reversible with:\n\n1. Continuing Atorvastatin ✓\n2. Reducing refined carbs and fried foods\n3. 30 minutes of brisk walking 5 days a week\n4. Keeping your diabetes (HbA1c) under control\n\nYour March 2025 lipid panel is now completely normal — keep the lifestyle changes going!', sourceDocIds: [], timestamp: d(2024, 9, 10) },
      ],
      createdAt: d(2024, 9, 10),
    },
    {
      userId: PATIENT_UID,
      title: 'Levothyroxine — how to take correctly',
      messages: [
        { role: 'user', content: 'Should I take levothyroxine before or after breakfast?', sourceDocIds: [], timestamp: d(2024, 8, 13) },
        { role: 'assistant', content: 'Take Levothyroxine strictly **30-60 minutes BEFORE breakfast** on a completely empty stomach with a full glass of water.\n\n**Avoid these within 4 hours of taking it:**\n- Calcium supplements (you take Calcium Carbonate — space it out!)\n- Iron supplements\n- Antacids containing calcium/aluminium\n- Coffee or tea\n- High-fibre foods\n\nWhy? These all dramatically reduce Levothyroxine absorption in the gut.', sourceDocIds: [], timestamp: d(2024, 8, 13) },
        { role: 'user', content: 'I forgot my dose yesterday. What should I do?', sourceDocIds: [], timestamp: d(2024, 8, 14) },
        { role: 'assistant', content: 'If you missed a dose:\n\n✅ **Same day or next morning** → Take it as soon as you remember (still on empty stomach)\n❌ **If it\'s almost time for the next dose** → Skip the missed one — do NOT double up\n\nMissing 1-2 doses occasionally won\'t cause a problem since Levothyroxine has a long half-life (~7 days). But try not to make it a habit — consistent daily dosing is important for stable TSH levels.', sourceDocIds: [], timestamp: d(2024, 8, 14) },
      ],
      createdAt: d(2024, 8, 13),
    },
    {
      userId: PATIENT_UID,
      title: 'Vitamin D was severely low',
      messages: [
        { role: 'user', content: 'My Vitamin D came back at 12.5. Is that very bad?', sourceDocIds: [], timestamp: d(2024, 5, 15) },
        { role: 'assistant', content: 'Yes, 12.5 ng/mL is in the **severely deficient** range. Here\'s the scale:\n\n- **<12**: Deficient (your territory)\n- **12-20**: Insufficient\n- **20-30**: Suboptimal\n- **30-100**: Normal ✅\n- **>100**: Potentially toxic\n\nAt 12.5, you may be experiencing fatigue, low mood, muscle weakness, and achy joints — common symptoms of severe Vitamin D deficiency. Dr. Joshi has prescribed 60,000 IU weekly for 8 weeks, then monthly maintenance.', sourceDocIds: [], timestamp: d(2024, 5, 15) },
        { role: 'user', content: 'Update — my November report says 38.4 now!', sourceDocIds: [], timestamp: d(2024, 11, 11) },
        { role: 'assistant', content: 'Excellent progress! 38.4 ng/mL is comfortably in the **normal range** (30-100). From 12.5 → 38.4 in 6 months is a great response to the weekly high-dose Vitamin D3.\n\nYou\'re now on monthly maintenance (60,000 IU once a month). Stick with it — Vitamin D levels can drop again in winter months or if you avoid sun. Your next check would be due around May 2025.', sourceDocIds: [], timestamp: d(2024, 11, 11) },
      ],
      createdAt: d(2024, 5, 15),
    },
    {
      userId: PATIENT_UID,
      title: 'Diabetes progress over 1 year',
      messages: [
        { role: 'user', content: 'How has my diabetes changed over the past year?', sourceDocIds: [], timestamp: d(2025, 4, 6) },
        { role: 'assistant', content: 'Here\'s your full HbA1c journey:\n\n| Date | HbA1c | Status |\n|------|-------|--------|\n| Apr 2024 | 7.2% | Suboptimal ⚠️ |\n| Oct 2024 | 6.5% | Improving 📈 |\n| Apr 2025 | 6.1% | Well controlled ✅ |\n\nYour fasting sugar dropped from 142 to 102 mg/dL — nearly normal! Post-meal sugar is also at target (<140).\n\n**What worked:** Metformin 500mg twice daily + dietary discipline + keeping thyroid and BP under control all contribute to better glucose metabolism. Keep it up — the goal is HbA1c <7%.', sourceDocIds: [], timestamp: d(2025, 4, 6) },
        { role: 'user', content: 'Do I need to test anything else for diabetes care?', sourceDocIds: [], timestamp: d(2025, 4, 6) },
        { role: 'assistant', content: 'Great question. For comprehensive diabetes care, annual checks should include:\n\n**Lab tests** (due if not done recently):\n- 🔬 HbA1c — every 3-6 months ✅ done\n- 🔬 Urine albumin:creatinine ratio (microalbuminuria) — kidney screening\n- 🔬 Fasting lipid panel ✅ done\n- 🔬 Vitamin B12 — Metformin depletes it over time ⚠️ (check this!)\n\n**Clinical checks:**\n- 👁️ Dilated retinal exam (diabetic retinopathy) — due annually\n- 🦶 Foot exam (neuropathy check) — due annually\n- ❤️ BP monitoring — done ✅\n\nBook a retinal screening and urine ACR test — these are the most commonly missed ones.', sourceDocIds: [], timestamp: d(2025, 4, 6) },
      ],
      createdAt: d(2025, 4, 6),
    },
    {
      userId: PATIENT_UID,
      title: 'Post surgery recovery — appendectomy',
      messages: [
        { role: 'user', content: 'What should I do and avoid after my appendix surgery?', sourceDocIds: [], timestamp: d(2025, 1, 6) },
        { role: 'assistant', content: 'Based on your January 2025 discharge summary from Jupiter Hospital (Dr. Patil), here are your recovery guidelines:\n\n**First 2 weeks:**\n- ✅ Soft, easily digestible foods (dal, khichdi, soups, curd rice)\n- ✅ Complete your antibiotic course (Amoxicillin-Clavulanate 625mg × 5 days)\n- ✅ Take Paracetamol if in pain — do NOT take Ibuprofen/Aspirin (wait for approval)\n- ❌ Avoid heavy meals, spicy/fried food\n- ❌ Avoid driving for 1 week\n\n**First 6 weeks:**\n- ❌ No heavy lifting (>5 kg)\n- ❌ No gym, running, or strenuous exercise\n- ✅ Gentle walking is encouraged\n\n**Wound care:**\n- Keep the incision site clean and dry\n- Watch for redness, swelling, or discharge — report immediately\n\nYour follow-up with Dr. Patil should be on 12 Jan 2025.', sourceDocIds: [], timestamp: d(2025, 1, 6) },
      ],
      createdAt: d(2025, 1, 6),
    },
    {
      userId: PATIENT_UID,
      title: 'Drug interactions with my medicines',
      messages: [
        { role: 'user', content: 'I have a headache. Can I take Ibuprofen?', sourceDocIds: [], timestamp: d(2025, 2, 15) },
        { role: 'assistant', content: '⚠️ **Caution — do NOT take Ibuprofen right now.** Here\'s why based on your current medicines:\n\n1. **Aspirin + Ibuprofen** → Ibuprofen blocks Aspirin\'s heart-protective effect and significantly increases GI bleeding risk\n2. **Ibuprofen + Amlodipine** → NSAIDs can raise blood pressure and reduce the effectiveness of antihypertensives\n3. **Ibuprofen + Metformin** → In high doses, can affect kidney function\n\n**Safer alternative for headache:**\n✅ Paracetamol (Crocin) 500-650mg — safe with all your current medications. Take after food.\n\nIf the headache is severe, frequent, or associated with vision changes / neck stiffness — please see your doctor immediately.', sourceDocIds: [], timestamp: d(2025, 2, 15) },
        { role: 'user', content: 'What about antihistamines for my allergy?', sourceDocIds: [], timestamp: d(2025, 2, 15) },
        { role: 'assistant', content: 'You already have Cetirizine 10mg prescribed (Dr. Mehta) for allergies — that\'s the ideal choice for you.\n\n**Cetirizine is safe with all your current medicines.** Take it at night since it can cause mild drowsiness.\n\n⚠️ Avoid older antihistamines like Chlorpheniramine (Avil) — they can cause urinary retention and significant drowsiness.\n\nFor nasal allergy with congestion, a nasal steroid spray (like Fluticasone) is also safe if needed — ask your doctor.', sourceDocIds: [], timestamp: d(2025, 2, 15) },
      ],
      createdAt: d(2025, 2, 15),
    },
    {
      userId: PATIENT_UID,
      title: 'Understanding my ECG and Echo results',
      messages: [
        { role: 'user', content: 'My echo report says "mild concentric LVH" — should I worry?', sourceDocIds: [], timestamp: d(2025, 3, 20) },
        { role: 'assistant', content: 'Mild concentric LVH (Left Ventricular Hypertrophy) means the muscular wall of your heart\'s main pumping chamber has thickened slightly. This is a **very common and expected finding in longstanding high blood pressure**.\n\n**Is it dangerous?** Mild LVH itself isn\'t immediately dangerous, but it\'s a signal that your blood pressure needs to be well-controlled.\n\n**Good news from your report:**\n- EF (ejection fraction) = 62% → Normal pumping (≥55% is normal ✅)\n- No wall motion abnormality ✅\n- Normal valves ✅\n\n**What helps reverse LVH:**\n1. Consistent BP control — your Amlodipine + Aspirin regimen is appropriate\n2. Reducing salt intake (<5g/day)\n3. Regular aerobic exercise (30 min, 5×/week)\n4. Weight management\n\nYour cardiologist (Dr. Shah) is already on top of this — continue his follow-up.', sourceDocIds: [], timestamp: d(2025, 3, 20) },
      ],
      createdAt: d(2025, 3, 20),
    },
  ]; // end chats

  await db.collection('chatsessions').insertMany(chats);
  console.log(`Inserted ${chats.length} chat sessions`);

  // ════════════════════════════════════════
  // ═══ WHATSAPP MESSAGES ═══
  // ════════════════════════════════════════
  const waMsgs = buildWhatsAppMessages(PATIENT_UID, '+919359025745');
  await db.collection('whatsappmessages').insertMany(waMsgs);
  console.log(`Inserted ${waMsgs.length} WhatsApp messages`);

  console.log('\n✅ Seed complete!');
  await mongoose.disconnect();
}

// ══════════════════════════════════════════
// ── Factory Functions ──
// ══════════════════════════════════════════
function lv(test_name: string, value: string, unit: string, reference_range: string, is_abnormal: boolean) {
  return { test_name, value, unit, reference_range, is_abnormal };
}

function mkDoc(
  userId: string, filename: string, documentType: string, documentDate: Date,
  sourceHospital: string, doctorName: string, conditionsMentioned: string[],
  medications: any[], labValues: any[], summaryPlain: string, summaryClinical: string,
  criticalityScore: number, tags: string[]
) {
  const meds = medications.map(m =>
    typeof m === 'string' ? { name: m, dosage: '', frequency: '', duration: '' } : m
  );
  return {
    userId, filename,
    filePath: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    mimeType: 'image/jpeg',
    fileSize: Math.floor(Math.random() * 500000) + 80000,
    status: 'done',
    uploadedAt: documentDate,
    processedAt: new Date(documentDate.getTime() + 90000),
    documentType, documentDate, sourceHospital, doctorName,
    conditionsMentioned, medications: meds, labValues,
    summaryPlain, summaryClinical, criticalityScore,
    keyFindings: tags.slice(0, 3).map(t => `Key finding: ${t}`),
    tags,
    embedding: vec128(),
  };
}

function mkRx(
  userId: string, drugName: string, dosage: string, frequency: string,
  prescribingDoctor: string, startDate: Date,
  status: 'active' | 'discontinued' = 'active',
  interactionWarnings: string[] = [],
  interactionSeverity: 'none' | 'mild' | 'moderate' | 'severe' = 'none'
) {
  return {
    userId, drugName, dosage, frequency, prescribingDoctor, startDate,
    status, interactionWarnings, interactionSeverity, createdAt: startDate,
    ...(status === 'discontinued' ? { endDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) } : {}),
  };
}

function buildWhatsAppMessages(userId: string, phone: string) {
  const msgs: any[] = [];
  const add = (dir: 'in' | 'out', content: string, date: Date) =>
    msgs.push({ userId, phoneNumber: phone, direction: dir, content, timestamp: date });

  const d = (y: number, m: number, day: number, h = 9, min = 0) => new Date(y, m - 1, day, h, min);

  // ── Onboarding ──
  add('in', 'hi', d(2024, 1, 20, 10, 0));
  add('out', '👋 Welcome to *MedVault*! Your personal AI health assistant.\n\nSend *menu* to see what I can do for you.', d(2024, 1, 20, 10, 0));
  add('in', 'menu', d(2024, 1, 20, 10, 1));
  add('out', '📋 *MedVault Menu*\n\n1️⃣ Health Summary\n2️⃣ My Medications\n3️⃣ Upload Document\n4️⃣ Lab Results\n5️⃣ Emergency Card\n6️⃣ Health Tip\n7️⃣ Appointment Reminder\n8️⃣ Drug Interaction Check\n\nType a number or ask me anything in plain English!', d(2024, 1, 20, 10, 1));

  // ── Health summary request ──
  add('in', '1', d(2024, 6, 2, 9, 5));
  add('out', '📊 *Your Health Summary — June 2024*\n\n🏥 Documents on file: 6\n💊 Active medications: 7\n⚠️ Abnormal values: 5\n📅 Last report: Jun 2024\n\n*Conditions being managed:*\n• Type 2 Diabetes (HbA1c 7.2%)\n• Hypertension\n• Hypothyroidism (TSH 6.8)\n• Hyperlipidemia (LDL 165)\n• Anaemia (Hb 11.2)\n• Vitamin D Deficiency\n\n🟡 Overall Health Score: 5.8/10\n\nSend *2* to see your medications.', d(2024, 6, 2, 9, 5));

  // ── Medication list ──
  add('in', '2', d(2024, 6, 3, 9, 10));
  add('out', '💊 *Active Medications — June 2024*\n\n1. Metformin 500mg — Twice daily with meals\n2. Amlodipine 5mg — Once daily at night\n3. Levothyroxine 50mcg — Morning empty stomach\n4. Pantoprazole 40mg — Before breakfast\n5. Vitamin D3 60000 IU — Once weekly\n6. Ferrous Ascorbate 100mg — Once daily after lunch\n7. Cetirizine 10mg — Night as needed\n\n⚠️ Total: 7 medications\n\nSend *8* to check drug interactions.', d(2024, 6, 3, 9, 10));

  // ── Medication reminders (automated) ──
  add('out', '🌅 *Good morning, Chirag!*\n\nRemember to take:\n• Levothyroxine 50mcg — NOW (empty stomach)\n\n⏰ Wait 30-45 min before breakfast.', d(2024, 6, 5, 7, 0));
  add('out', '🍽️ *Meal time reminder*\n\nWith breakfast/lunch:\n• Metformin 500mg\n• Ferrous Ascorbate 100mg\n\nWith dinner:\n• Metformin 500mg\n• Amlodipine 5mg\n• Pantoprazole 40mg', d(2024, 6, 5, 8, 30));
  add('out', '📅 *Weekly Reminder*\n\nToday is your *Vitamin D3 60000 IU* dose day!\n\nTake it with a fatty meal (e.g., after lunch) for best absorption. ☀️', d(2024, 6, 9, 10, 0));

  // ── Lab result query ──
  add('in', 'What is my HbA1c?', d(2024, 10, 10, 11, 0));
  add('out', '🧪 *HbA1c History*\n\n📅 Apr 2024: *7.2%* ⚠️ (Suboptimal)\n📅 Oct 2024: *6.5%* 📈 (Improving)\n\nTarget for diabetics: <7.0%\n\nYou\'re making great progress! Your fasting sugar also dropped from 142 to 118 mg/dL. Keep it up! 💪', d(2024, 10, 10, 11, 0));

  add('in', 'Show me my cholesterol trend', d(2024, 10, 11, 15, 30));
  add('out', '📈 *Cholesterol Trend*\n\n*LDL (Bad Cholesterol):*\n📅 Mar 2024: 165 mg/dL ⚠️\n📅 Sep 2024: 132 mg/dL 📈\nTarget: <100 mg/dL\n\n*Total Cholesterol:*\n📅 Mar 2024: 242 mg/dL ⚠️\n📅 Sep 2024: 210 mg/dL 📈\nTarget: <200 mg/dL\n\n*Triglycerides:*\n📅 Mar 2024: 198 mg/dL ⚠️\n📅 Sep 2024: 155 mg/dL 📈\n\nAtorvastatin is working! LDL still needs to come down further. Stay on your current dose.', d(2024, 10, 11, 15, 30));

  // ── Drug interaction check ──
  add('in', 'Can I take Ibuprofen for headache?', d(2025, 2, 15, 14, 0));
  add('out', '⚠️ *Drug Interaction Alert*\n\n❌ Ibuprofen is NOT recommended for you because:\n\n1. *Ibuprofen + Aspirin* — Reduces Aspirin\'s heart-protective effect + GI bleeding risk 🩸\n2. *Ibuprofen + Amlodipine* — Can raise blood pressure\n3. *Ibuprofen + Metformin* — Risk to kidneys\n\n✅ *Safe alternative: Paracetamol (Crocin) 500mg*\nSafe with ALL your current medications. Take after food.\n\nIf headaches are frequent, consult Dr. Mehta.', d(2025, 2, 15, 14, 0));

  // ── Vitamin D query ──
  add('in', 'My vitamin d came back 38.4 — is that good?', d(2024, 11, 11, 10, 30));
  add('out', '🎉 *Great news!*\n\nVitamin D: *38.4 ng/mL* ✅ (Normal range: 30-100)\n\nYou\'ve gone from severely deficient (12.5) to normal in 6 months! 🌞\n\nYou\'re now on monthly maintenance dose. Keep taking Vitamin D3 60,000 IU once monthly.', d(2024, 11, 11, 10, 30));

  // ── Surgery notification ──
  add('in', 'I had appendix surgery yesterday. What should I eat?', d(2025, 1, 6, 12, 0));
  add('out', '🏥 *Post-Surgery Diet — Week 1*\n\n✅ *Eat:*\n• Clear liquids → thin dal water, coconut water, broth\n• Soft foods → khichdi, curd rice, steamed idli, banana\n• Small, frequent meals\n\n❌ *Avoid:*\n• Spicy, fried, or heavy foods\n• Raw salads or high-fibre foods\n• Carbonated drinks\n• Alcohol completely\n\n🚫 No heavy lifting for 6 weeks.\n💊 Complete full antibiotic course.\n\nGet well soon! 🙏', d(2025, 1, 6, 12, 0));

  // ── Appointment reminder ──
  add('out', '📅 *Appointment Reminder*\n\nYou have a follow-up with *Dr. Vijay Desai* (Diabetologist) tomorrow at 11:00 AM.\n\n📍 Metropolis Clinic, Andheri\n\n*Bring:*\n✅ October HbA1c report\n✅ Fasting blood sugar reading from this morning\n✅ Your medication list\n\nReply *confirm* to acknowledge.', d(2025, 4, 4, 18, 0));
  add('in', 'confirm', d(2025, 4, 4, 18, 5));
  add('out', '✅ Got it! Appointment confirmed for tomorrow with Dr. Desai. Stay healthy! 💙', d(2025, 4, 4, 18, 5));

  // ── Emergency card ──
  add('in', '5', d(2025, 3, 10, 9, 0));
  add('out', '🆘 *Emergency Medical Card — Chirag Simepurushkar*\n\n🩸 Blood Type: *B+*\n🎂 DOB: 15 Mar 1998 (Age 27)\n\n⚠️ *Allergies:*\n• Penicillin\n• Aspirin (caution — not allergy, on low dose for cardiac)\n\n💊 *Active Medications:*\nMetformin 500mg | Amlodipine 5mg | Atorvastatin 20mg | Levothyroxine 50mcg | Aspirin 75mg | Vitamin D3 | Cetirizine\n\n🏥 *Conditions:*\nT2 Diabetes | HTN | Hypothyroidism | Dyslipidemia\n\n📞 *Emergency Contact:*\nRavi Simepurushkar — +919876543210 (Father)\n\n🔗 Full card: medvault.app/emergency/f47ac10b', d(2025, 3, 10, 9, 0));

  // ── Health tip ──
  add('out', '💡 *Daily Health Tip*\n\n🫀 *For Diabetics with Hypertension:*\nReducing sodium intake by just 1g/day can lower systolic BP by 2-4 mmHg — equivalent to a mild antihypertensive!\n\nPractical tip: Avoid papads, pickles, packaged chips, and adding extra salt at the table.', d(2025, 4, 15, 8, 0));
  add('out', '💡 *Medication Tip*\n\n⚠️ *Metformin & Vitamin B12:*\nLong-term Metformin use can reduce Vitamin B12 absorption. Symptoms of low B12: numbness, tingling, fatigue, memory issues.\n\nYou\'ve been on Metformin for 1 year — ask Dr. Desai to check your B12 level at the next visit! 🔬', d(2025, 4, 20, 9, 0));

  // ── Recent summary (Apr 2025) ──
  add('in', 'health summary', d(2025, 4, 26, 10, 0));
  add('out', '📊 *Your Health Summary — April 2025*\n\n🏥 Documents on file: 20\n💊 Active medications: 8\n✅ Abnormal values: 2 (down from 5!)\n📅 Last report: April 2025\n\n*Conditions — Current Status:*\n• Diabetes T2 ✅ Controlled (HbA1c 6.1%)\n• Hypertension ✅ Controlled (BP ~128/82)\n• Hypothyroidism ✅ Controlled (TSH 2.1)\n• Dyslipidemia ✅ Resolved (LDL 95)\n• Anaemia ✅ Resolved (Hb 13.6)\n• Vitamin D ✅ Replete (38.4)\n• Fatty Liver ⚠️ Grade 1 — monitor\n• Mild LVH ⚠️ On Echo — monitor BP\n\n🟢 Overall Health Score: *8.1/10*\n\nIncredible 1-year progress, Chirag! 🎉', d(2025, 4, 26, 10, 0));

  return msgs;
}

main().catch(e => { console.error(e); process.exit(1); });