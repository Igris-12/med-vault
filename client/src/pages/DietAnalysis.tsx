import { useState } from 'react';
import { Camera, Apple, BrainCircuit, PieChart, Activity, Target, AlertTriangle, ArrowRight } from 'lucide-react';

export default function DietAnalysis() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done'>('idle');

  const handleUpload = () => {
    // mock uploading a photo
    setPhoto('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80');
    setStatus('analyzing');
    setTimeout(() => {
      setStatus('done');
    }, 2500);
  };

  const THEME = { 
    bg: 'var(--dd-bg)', 
    card: 'var(--dd-card)', 
    primary: 'var(--dd-accent)', 
    accent: '#10B981', 
    text: 'var(--dd-text)', 
    muted: 'var(--dd-muted)', 
    border: 'var(--dd-border)' 
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: THEME.text, maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: THEME.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Apple color={THEME.accent} size={28} />
          Diet & Nutrition Analysis
        </h1>
        <p style={{ color: THEME.muted, marginTop: 8, fontSize: 15 }}>Upload your meal photo for instant AI nutrient analysis, RAG-based health suggestions, and daily tracking.</p>
      </div>

      {status === 'idle' && (
        <div 
          onClick={handleUpload}
          style={{ 
            background: THEME.card, border: `2px dashed ${THEME.border}`, borderRadius: 16, 
            padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = THEME.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = THEME.border}
        >
          <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: 20, borderRadius: '50%' }}>
            <Camera size={40} color={THEME.primary} />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: THEME.text }}>Click to upload meal photo</h3>
          <p style={{ margin: 0, color: THEME.muted, fontSize: 14 }}>Supports JPG, PNG, WEBP</p>
        </div>
      )}

      {status === 'analyzing' && (
        <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ animation: 'pulse 1.5s infinite' }}>
            <BrainCircuit size={48} color={THEME.primary} />
          </div>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.05); } }`}</style>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: THEME.text }}>Analyzing Food Nutrients...</h3>
          <p style={{ margin: 0, color: THEME.muted, fontSize: 14 }}>Extracting ingredients and cross-referencing with your clinical profile.</p>
        </div>
      )}

      {status === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Meal Photo */}
            <div style={{ flex: 1, minWidth: 300, background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <img src={photo!} alt="Meal" style={{ width: '100%', height: 260, objectFit: 'cover' }} />
              <div style={{ padding: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: THEME.text }}>Grilled Chicken Salad</h3>
                <p style={{ margin: '4px 0 0', color: THEME.muted, fontSize: 14 }}>Estimated Weight: 350g</p>
              </div>
            </div>

            {/* Nutrients Analysis */}
            <div style={{ flex: 1, minWidth: 300, background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <PieChart size={20} color={THEME.primary} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: THEME.text }}>Nutrients Analysis</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Calories', val: '420 kcal', col: '#F59E0B', pct: 60 },
                  { label: 'Protein', val: '38g', col: '#10B981', pct: 80 },
                  { label: 'Carbs', val: '22g', col: '#3B82F6', pct: 40 },
                  { label: 'Fats', val: '18g', col: '#EF4444', pct: 50 },
                  { label: 'Iron', val: '3.2mg', col: '#8B5CF6', pct: 70 },
                  { label: 'Sodium', val: '410mg', col: '#64748B', pct: 45 },
                ].map(n => (
                  <div key={n.label} style={{ background: 'rgba(100, 116, 139, 0.05)', padding: 16, borderRadius: 12 }}>
                    <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>{n.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: THEME.text, marginBottom: 8 }}>{n.val}</div>
                    <div style={{ height: 6, background: 'rgba(100, 116, 139, 0.2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${n.pct}%`, background: n.col, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* AI Suggestion (RAG) */}
            <div style={{ flex: 1, minWidth: 300, background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <BrainCircuit size={20} color={THEME.primary} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: THEME.text }}>AI Clinical Suggestion (RAG)</h3>
              </div>
              <div style={{ background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(79, 70, 229, 0.2)', padding: 20, borderRadius: 12 }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: THEME.text }}>
                  Based on your <strong>extracted patient history</strong> (Type 2 Diabetes and elevated cholesterol), this meal is a safe choice. The grilled chicken provides lean protein without excess saturated fats. 
                  <br/><br/>
                  <em style={{ color: THEME.primary }}>Suggestion:</em> Consider swapping the creamy dressing for olive oil and vinegar to better align with your cardiovascular goals.
                </p>
              </div>
            </div>

            {/* Daily Targets & AI Next Meal */}
            <div style={{ flex: 1, minWidth: 300, background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Target size={20} color={THEME.accent} />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: THEME.text }}>Daily Targets & Next Steps</h3>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
                
                {/* Target Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>Daily Carbohydrates (Diabetic History)</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.primary }}>120 / 180 g</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(100, 116, 139, 0.2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '66%', background: THEME.primary, borderRadius: 4 }} />
                  </div>
                </div>

                {/* Clinical Alert */}
                <div style={{ background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.2)', padding: 12, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} color="#D97706" style={{ marginTop: 2, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, color: THEME.text, lineHeight: 1.5 }}>
                    <strong style={{ color: '#D97706' }}>Blood Sugar Alert:</strong> Based on your HbA1c history, avoid simple carbohydrates for dinner to prevent overnight glucose spikes.
                  </p>
                </div>

                {/* AI Next Meal */}
                <div style={{ marginTop: 'auto', background: 'rgba(100, 116, 139, 0.05)', border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>AI Dinner Recommendation</div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: THEME.text }}>Baked Salmon with Asparagus</h4>
                  <p style={{ margin: 0, fontSize: 13, color: THEME.muted, lineHeight: 1.5 }}>
                    High in omega-3s and fiber, perfectly aligned with your cardiovascular and diabetic medical history.
                  </p>
                  <button style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: THEME.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    View Recipe <ArrowRight size={14} />
                  </button>
                </div>

              </div>
            </div>
          </div>
          
          <button onClick={() => setStatus('idle')} style={{ alignSelf: 'center', marginTop: 16, padding: '12px 32px', background: 'transparent', color: THEME.text, border: `1px solid ${THEME.border}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(100, 116, 139, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Analyze Another Meal
          </button>
        </div>
      )}
    </div>
  );
}
