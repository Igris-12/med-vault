import { useState, useRef } from 'react';
import { Camera, Apple, BrainCircuit, PieChart, Activity, Target, AlertTriangle, Loader2, X, Upload } from 'lucide-react';
import { getAuthToken } from '../api/base';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface NutrientData {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sodium: number;
  iron: number;
  calcium: number;
}

interface DietResult {
  mealName: string;
  estimatedWeight: string;
  nutrients: NutrientData;
  healthScore: number;
  assessment: string;
  suggestions: string[];
  nextMeal: { name: string; reason: string };
  alerts: string[];
  rawAnalysis?: string;
}

export default function DietAnalysis() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mealText, setMealText] = useState('');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<DietResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const THEME = {
    bg: 'var(--dd-bg)', card: 'var(--dd-card)', primary: 'var(--dd-accent)',
    accent: '#10B981', text: 'var(--dd-text)', muted: 'var(--dd-text-muted)',
    border: 'var(--dd-border)'
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('idle');
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('idle');
    setResult(null);
  };

  const analyze = async () => {
    if (!file && !mealText.trim()) return;
    setStatus('analyzing');
    setErrorMsg('');

    try {
      const token = await getAuthToken();
      const formData = new FormData();
      if (file) formData.append('image', file);
      if (mealText.trim()) formData.append('mealDescription', mealText);

      const res = await fetch(`${API_BASE}/api/diet/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Analysis failed');
      }

      setResult(json.data);
      setStatus('done');
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStatus('error');
    }
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    setMealText('');
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const healthScoreColor = (score: number) =>
    score >= 8 ? '#10B981' : score >= 5 ? '#F59E0B' : '#EF4444';

  const NUTRIENTS_CONFIG = [
    { key: 'calories', label: 'Calories', unit: 'kcal', max: 800, color: '#F59E0B' },
    { key: 'protein',  label: 'Protein',  unit: 'g',    max: 60,  color: '#10B981' },
    { key: 'carbs',    label: 'Carbs',    unit: 'g',    max: 100, color: '#3B82F6' },
    { key: 'fats',     label: 'Fats',     unit: 'g',    max: 50,  color: '#EF4444' },
    { key: 'fiber',    label: 'Fiber',    unit: 'g',    max: 30,  color: '#8B5CF6' },
    { key: 'sodium',   label: 'Sodium',   unit: 'mg',   max: 1000,color: '#64748B' },
    { key: 'iron',     label: 'Iron',     unit: 'mg',   max: 20,  color: '#DC2626' },
    { key: 'calcium',  label: 'Calcium',  unit: 'mg',   max: 500, color: '#0891B2' },
  ] as const;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: THEME.text, maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: THEME.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Apple color={THEME.accent} size={28} />
          Diet &amp; Nutrition Analysis
        </h1>
        <p style={{ color: THEME.muted, marginTop: 8, fontSize: 15 }}>
          Upload your meal photo or describe your meal — get instant AI nutrition analysis powered by your health profile.
        </p>
      </div>

      {/* ── Upload / Input Section ── */}
      {(status === 'idle' || status === 'error') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !preview && inputRef.current?.click()}
            style={{
              background: THEME.card, border: `2px dashed ${THEME.border}`, borderRadius: 16,
              padding: preview ? 0 : 60, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 16, cursor: preview ? 'default' : 'pointer', transition: 'all 0.2s',
              overflow: 'hidden', minHeight: preview ? 'auto' : undefined,
            }}
            onMouseEnter={(e) => { if (!preview) e.currentTarget.style.borderColor = THEME.primary; }}
            onMouseLeave={(e) => { if (!preview) e.currentTarget.style.borderColor = THEME.border; }}
          >
            {preview ? (
              <div style={{ position: 'relative', width: '100%' }}>
                <img src={preview} alt="Meal" style={{ width: '100%', maxHeight: 320, objectFit: 'cover' }} />
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  style={{
                    position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)',
                    border: 'none', borderRadius: '50%', color: '#fff', padding: 6, cursor: 'pointer', display: 'flex',
                  }}
                >
                  <X size={16} />
                </button>
                <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: THEME.muted }}>{file?.name}</span>
                  <button onClick={() => inputRef.current?.click()} style={{ background: 'none', border: 'none', color: THEME.primary, fontSize: 13, cursor: 'pointer' }}>
                    Change photo
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ background: 'rgba(79,70,229,0.1)', padding: 20, borderRadius: '50%' }}>
                  <Camera size={40} color={THEME.primary} />
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: THEME.text }}>
                  Drop meal photo here or click to browse
                </h3>
                <p style={{ margin: 0, color: THEME.muted, fontSize: 14 }}>Supports JPG, PNG, WEBP · Max 10MB</p>
              </>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />

          {/* Text fallback */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: THEME.muted, fontWeight: 600 }}>
              OR describe your meal in text:
            </p>
            <textarea
              value={mealText}
              onChange={(e) => setMealText(e.target.value)}
              placeholder="e.g. Bowl of dal rice with a banana, approximately 400g"
              rows={3}
              className="mv-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          {status === 'error' && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: 14, borderRadius: 10, color: '#ef4444', fontSize: 14 }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={!file && !mealText.trim()}
            style={{
              alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', background: THEME.primary, color: '#fff',
              border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15,
              cursor: (!file && !mealText.trim()) ? 'not-allowed' : 'pointer',
              opacity: (!file && !mealText.trim()) ? 0.5 : 1, transition: 'all 0.2s',
            }}
          >
            <Activity size={18} /> Analyze with AI
          </button>
        </div>
      )}

      {/* ── Analyzing ── */}
      {status === 'analyzing' && (
        <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <Loader2 size={48} color={THEME.primary} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: THEME.text }}>Analyzing with AI…</h3>
          <p style={{ margin: 0, color: THEME.muted, fontSize: 14 }}>
            Sending to Gemini via the AI scraper · Cross-referencing with your health profile
          </p>
        </div>
      )}

      {/* ── Results ── */}
      {status === 'done' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Meal photo + identity */}
            <div style={{ flex: 1, minWidth: 280, background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, overflow: 'hidden' }}>
              {preview && <img src={preview} alt="Meal" style={{ width: '100%', height: 220, objectFit: 'cover' }} />}
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: THEME.text }}>{result.mealName ?? 'Unknown meal'}</h3>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#fff',
                    background: healthScoreColor(result.healthScore ?? 0),
                  }}>
                    {result.healthScore ?? '—'}/10
                  </div>
                </div>
                <p style={{ margin: 0, color: THEME.muted, fontSize: 13 }}>Est. weight: {result.estimatedWeight ?? 'Unknown'}</p>
                <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: THEME.text }}>{result.assessment ?? result.rawAnalysis ?? 'No assessment available.'}</p>
              </div>
            </div>

            {/* Nutrients */}
            <div style={{ flex: 1, minWidth: 280, background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <PieChart size={20} color={THEME.primary} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: THEME.text }}>Nutrient Breakdown</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {result.nutrients
                  ? NUTRIENTS_CONFIG.map(({ key, label, unit, max, color }) => {
                      const val = (result.nutrients as unknown as Record<string, number>)[key] ?? 0;
                      const pct = Math.min(100, Math.round((val / max) * 100));
                      return (
                        <div key={key} style={{ background: 'rgba(100,116,139,0.05)', padding: 14, borderRadius: 10 }}>
                          <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 19, fontWeight: 800, color: THEME.text, marginBottom: 6 }}>{val} {unit}</div>
                          <div style={{ height: 5, background: 'rgba(100,116,139,0.2)', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 1s ease' }} />
                          </div>
                        </div>
                      );
                    })
                  : <p style={{ color: THEME.muted, fontSize: 13, gridColumn: '1/-1' }}>Nutrient data unavailable — the AI may not have analysed the image yet.</p>
                }
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* AI Suggestions */}
            <div style={{ flex: 1, minWidth: 280, background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <BrainCircuit size={20} color={THEME.primary} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: THEME.text }}>AI Clinical Suggestions</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(result.suggestions ?? []).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: THEME.accent, fontWeight: 700, flexShrink: 0 }}>→</span>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: THEME.text }}>{s}</p>
                  </div>
                ))}
                {!result.suggestions?.length && (
                  <p style={{ margin: 0, fontSize: 13, color: THEME.muted }}>No suggestions available yet.</p>
                )}
              </div>

              {/* Alerts */}
              {result.alerts?.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.alerts.map((a, i) => (
                    <div key={i} style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)', padding: 10, borderRadius: 8, display: 'flex', gap: 8 }}>
                      <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                      <p style={{ margin: 0, fontSize: 13, color: THEME.text, lineHeight: 1.5 }}>{a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Next Meal Recommendation */}
            <div style={{ flex: 1, minWidth: 280, background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Target size={20} color={THEME.accent} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: THEME.text }}>Next Meal Recommendation</h3>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', padding: 18, borderRadius: 12 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: THEME.text }}>{result.nextMeal?.name ?? 'See suggestions above'}</h4>
                <p style={{ margin: 0, fontSize: 14, color: THEME.muted, lineHeight: 1.6 }}>{result.nextMeal?.reason ?? 'Based on your current meal, refer to the clinical suggestions for guidance.'}</p>
              </div>
            </div>
          </div>

          <button onClick={reset} style={{
            alignSelf: 'center', marginTop: 8, padding: '11px 28px',
            background: 'transparent', color: THEME.text, border: `1px solid ${THEME.border}`,
            borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Upload size={15} /> Analyze Another Meal
          </button>
        </div>
      )}
    </div>
  );
}
