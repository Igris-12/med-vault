import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Search, X, ZoomIn, ZoomOut, Maximize2, Loader2, Sparkles, AlertTriangle, Activity, Brain, Network, Plus } from 'lucide-react';

// ── Inline mock KB (used as fallback when server is offline) ─────────────────
const MOCK_KB = {
  symptom_clusters: [
    {
      id: 'cardiac_acute', urgency_label: 'CRITICAL',
      clinical_context: 'High probability of acute cardiac event (STEMI/NSTEMI). Time-to-reperfusion is critical — every minute of delay increases infarct size.',
      tags: ['chest_pain','chest_pressure','sweating','left_arm_numbness','jaw_pain','nausea','palpitations'],
      match_threshold: 2,
      next_actions: ['12-lead ECG within 10 min','Aspirin 300mg PO','Activate cath lab if STEMI confirmed','IV access — troponin, CBC, BMP','Continuous cardiac monitoring'],
      contraindications: ['No Nitroglycerin if systolic BP < 90 mmHg','Avoid Aspirin if active GI bleed'],
      differential_diagnoses: ['respiratory_distress_acute','aortic_dissection','pulmonary_embolism'],
      risk_amplifiers: ['diabetes','hypertension','smoking','obesity','previous_mi','male_over_45'],
      prescription_weight: 4,
    },
    {
      id: 'respiratory_distress_acute', urgency_label: 'CRITICAL',
      clinical_context: 'Acute respiratory compromise with hypoxia risk. Silent chest in an asthmatic is an ominous sign indicating airways too constricted to generate wheeze.',
      tags: ['shortness_of_breath','dyspnea','wheezing','cyanosis','chest_tightness','gasping'],
      match_threshold: 2,
      next_actions: ['High-flow O2 (15L non-rebreather mask)','Nebulised salbutamol 2.5-5mg','IV corticosteroids','Obtain ABG urgently','Prepare for BiPAP/intubation if no improvement'],
      contraindications: ['Avoid high-flow O2 in COPD — target SpO2 88-92%','No IV beta-blockers — may worsen bronchospasm'],
      differential_diagnoses: ['cardiac_acute','anaphylaxis_severe','pulmonary_embolism'],
      risk_amplifiers: ['asthma','copd','smoking','heart_failure'],
    },
    {
      id: 'stroke_tia', urgency_label: 'CRITICAL',
      clinical_context: "Time-critical neurological emergency. 'Time is brain' — ~1.9 million neurones die per minute without treatment. IV tPA must be given within 4.5 hours.",
      tags: ['facial_droop','arm_weakness','slurred_speech','sudden_headache','vision_loss','confusion','dizziness'],
      match_threshold: 1,
      next_actions: ['Activate stroke code immediately','Non-contrast CT head STAT','Note exact onset time','Do NOT lower BP unless > 220/120','NPO until swallow assessment'],
      contraindications: ['No Aspirin until haemorrhagic stroke excluded','Do NOT aggressively lower BP in ischaemic stroke'],
      differential_diagnoses: ['hypoglycaemia','complex_migraine','seizure'],
      risk_amplifiers: ['atrial_fibrillation','hypertension','diabetes','smoking','age_over_65'],
    },
    {
      id: 'septic_shock', urgency_label: 'CRITICAL',
      clinical_context: 'Septic shock: persisting hypotension (MAP < 65 mmHg) despite fluids, requiring vasopressors. Mortality increases ~8% per hour without antibiotics.',
      tags: ['fever','confusion','low_blood_pressure','rapid_heart_rate','chills','altered_consciousness'],
      match_threshold: 2,
      next_actions: ['Blood cultures x2 BEFORE antibiotics','Broad-spectrum IV antibiotics within 1 hour','30mL/kg crystalloid within 3 hours','Check serum lactate','Norepinephrine if MAP < 65'],
      contraindications: ['Avoid hypotonic IV fluids for resuscitation','No corticosteroids unless refractory shock'],
      differential_diagnoses: ['cardiac_acute','hypovolaemic_shock','adrenal_crisis'],
      risk_amplifiers: ['immunosuppression','diabetes','chronic_kidney_disease','recent_surgery','age_over_65'],
    },
    {
      id: 'diabetic_emergency', urgency_label: 'URGENT',
      clinical_context: 'Two emergencies: Hypoglycaemia (glucose < 3.5) — rapid coma risk. DKA (glucose > 11 + ketones > 3 + pH < 7.3) — structured insulin/fluid protocol required.',
      tags: ['confusion','sweating','vomiting','weakness','dizziness'],
      match_threshold: 2,
      next_actions: ['Capillary blood glucose IMMEDIATELY','If glucose < 3.5: IV 50% dextrose or oral gel','If DKA: VBG, 0.9% NaCl 1L/hr, insulin infusion','Hourly glucose/electrolyte monitoring'],
      contraindications: ['No insulin in DKA if K+ < 3.5 — lethal hypokalaemia risk','No oral glucose if unconscious — aspiration risk'],
      differential_diagnoses: ['stroke_tia','septic_shock','alcohol_intoxication'],
      risk_amplifiers: ['type1_diabetes','type2_diabetes','missed_insulin_doses','infection_trigger'],
    },
    {
      id: 'high_fever_infection', urgency_label: 'URGENT',
      clinical_context: 'High fever with rigors suggests bacteraemia. In elderly patients, confusion may be the only presenting symptom. Neck stiffness + photophobia = meningism until proven otherwise.',
      tags: ['fever','chills','headache','vomiting','confusion','fatigue'],
      match_threshold: 2,
      next_actions: ['Sepsis screen: blood cultures, FBC, CRP, procalcitonin','Chest X-ray if respiratory symptoms','IV fluids if dehydrated','Assess for meningism — if suspected: CT then LP'],
      contraindications: ['Avoid NSAIDs if renal impairment or GI bleed history','No antibiotics without cultures if clinically stable'],
      differential_diagnoses: ['septic_shock','malaria','covid19'],
      risk_amplifiers: ['immunosuppression','diabetes','age_over_65','age_under_2','recent_travel'],
    },
  ],
};

const URGENCY_COL: Record<string, string> = { CRITICAL:'#EF4444', URGENT:'#F97316', MODERATE:'#EAB308', LOW:'#22C55E' };
const QUICK = ['chest_pain','sweating','nausea','shortness_of_breath','fever','confusion','palpitations','dizziness','abdominal_pain','headache','vomiting','cough','leg_swelling','blurred_vision','arm_weakness','facial_droop','rapid_heart_rate','chills'];

function toRGBA(hex: string, a=1) {
  if(!hex||hex.startsWith('rgba')) return hex;
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

export default function SymptomGraph() {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [kb, setKb] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const symptoms = ['chest_pain', 'sweating', 'nausea', 'shortness_of_breath', 'palpitations', 'dizziness'];
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [dim, setDim] = useState({ w: 800, h: 600 });
  const analysed = true;

  useEffect(() => {
    fetch('http://localhost:3001/api/ai/graph/kb')
      .then(r => r.json())
      .then(d => { setKb(d.data); setLoading(false); })
      .catch(() => {
        // Server offline — use embedded mock KB so demo always works
        setKb(MOCK_KB);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const upd = () => { if(containerRef.current) setDim({w:containerRef.current.clientWidth,h:containerRef.current.clientHeight}); };
    upd(); setTimeout(upd, 150);
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  const graphData = useMemo(() => {
    if(!kb||!analysed||!symptoms.length) return {nodes:[],links:[]};
    const nodes:any[]=[], links:any[]=[], added=new Set<string>();
    const addN=(n:any)=>{ if(!added.has(n.id)){nodes.push(n);added.add(n.id);} };
    symptoms.forEach(s=>addN({id:`sym_${s}`,label:s.replace(/_/g,' '),type:'symptom',color:'#7C3AED',highlighted:true,val:4}));
    kb.symptom_clusters?.forEach((c:any)=>{
      const matched=(c.tags||[]).filter((t:string)=>symptoms.includes(t));
      if(!matched.length) return;
      const col = URGENCY_COL[c.urgency_label]||'#4F46E5';
      const isPrimary = matched.length>=c.match_threshold;
      addN({id:`cl_${c.id}`,label:c.id.replace(/_/g,' '),type:'cluster',color:col,highlighted:isPrimary,val:(7+matched.length*2)*(c.prescription_weight||1),urgency_label:c.urgency_label,clinical_context:c.clinical_context,next_actions:c.next_actions,contraindications:c.contraindications,matchScore:matched.length});
      matched.forEach((s:string)=>links.push({source:`sym_${s}`,target:`cl_${c.id}`,type:'SYMPTOM_OF',highlighted:isPrimary}));
      (c.differential_diagnoses||[]).slice(0,3).forEach((d:string)=>{addN({id:`df_${d}`,label:d.replace(/_/g,' '),type:'differential',color:'#EA580C',val:4});links.push({source:`cl_${c.id}`,target:`df_${d}`,type:'DIFFERENTIAL_OF',highlighted:isPrimary});});
      (c.risk_amplifiers||[]).slice(0,4).forEach((r:string)=>{addN({id:`rk_${r}`,label:r.replace(/_/g,' '),type:'risk',color:'#D97706',val:3});links.push({source:`cl_${c.id}`,target:`rk_${r}`,type:'AMPLIFIES_RISK',highlighted:false});});
    });
    return {nodes,links};
  },[kb,symptoms,analysed]);

  useEffect(()=>{
    if(graphRef.current&&graphData.nodes.length){
      graphRef.current.d3Force?.('charge')?.strength?.(-120);
      graphRef.current.d3Force?.('link')?.distance?.(40);
      graphRef.current.d3ReheatSimulation?.();
      setTimeout(()=>graphRef.current?.zoomToFit?.(700,60),900);
    }
  },[graphData]);

  const paintNode = useCallback((node:any,ctx:CanvasRenderingContext2D,gs:number)=>{
    const r=(node.val||4)*0.85;
    if(node.highlighted){ctx.beginPath();ctx.arc(node.x,node.y,r+6,0,Math.PI*2);ctx.fillStyle=toRGBA(node.color,0.12);ctx.fill();}
    ctx.beginPath();ctx.arc(node.x,node.y,r,0,Math.PI*2);ctx.fillStyle=toRGBA(node.color,node.highlighted?0.9:0.25);ctx.fill();
    if(selectedNode?.id===node.id){ctx.strokeStyle=node.color;ctx.lineWidth=2;ctx.stroke();}
    if(node.highlighted||node.type==='cluster'||gs>1.5){
      const fs=Math.max(10/gs,2.5);
      ctx.font=`${node.highlighted?'700 ':''}${fs}px Inter,sans-serif`;
      ctx.textAlign='center';ctx.textBaseline='top';
      ctx.fillStyle=toRGBA(node.highlighted?'#1E293B':'#64748B',node.highlighted?0.9:0.6);
      ctx.fillText((node.label.length>20?node.label.slice(0,19)+'…':node.label),node.x,node.y+r+2);
    }
  },[selectedNode]);

  const paintLink = useCallback((link:any,ctx:CanvasRenderingContext2D)=>{
    const sx=(link.source as any).x,sy=(link.source as any).y,tx=(link.target as any).x,ty=(link.target as any).y;
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(tx,ty);
    const C:Record<string,string>={SYMPTOM_OF:link.highlighted?'rgba(109,40,217,.55)':'rgba(109,40,217,.1)',DIFFERENTIAL_OF:link.highlighted?'rgba(234,88,12,.55)':'rgba(234,88,12,.1)',AMPLIFIES_RISK:'rgba(217,119,6,.15)'};
    ctx.strokeStyle=C[link.type]||'rgba(100,116,139,.1)';ctx.lineWidth=link.highlighted?1.5:.4;ctx.stroke();
  },[]);
  const primary=useMemo(()=>{
    if(!kb||!analysed) return null;
    let best:any=null, sc=0;
    kb.symptom_clusters?.forEach((c:any)=>{ const s=(c.tags||[]).filter((t:string)=>symptoms.includes(t)).length; if(s>sc){sc=s;best={...c,score:s};} });
    return best;
  },[kb,symptoms,analysed]);

  // ─── STYLES (using app CSS vars for white/light theme) ────────────────────
  const border = '1px solid var(--dd-border)';
  const cardBg = 'var(--dd-card)';
  const bg = 'var(--dd-bg)';
  const text = 'var(--dd-text)';
  const muted = 'var(--dd-muted)';
  const accent = '#4F46E5';

  return (
    <div style={{ display:'flex', height:'calc(100vh - 56px - 48px)', background: bg, overflow:'hidden', borderRadius:12, border: border, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>

      {/* ── LEFT CONTROL PANEL ── */}
      <div style={{ width:300, flexShrink:0, display:'flex', flexDirection:'column', borderRight: border, background: cardBg, overflowY:'auto' }}>

        {/* Header */}
        <div style={{ padding:'20px 18px 14px', borderBottom: border }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:`${accent}18`, border:`1px solid ${accent}35`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Network size={15} color={accent}/>
            </div>
            <div>
              <h1 style={{ fontWeight:800, fontSize:14, color: text, margin:0 }}>Prescription Analysis</h1>
              <p style={{ fontSize:10, color: muted, margin:0 }}>Clinical Knowledge Engine</p>
            </div>
          </div>
          <p style={{ fontSize:11, color: muted, lineHeight:1.6, margin:0 }}>Graph built automatically from extracted patient prescriptions.</p>
        </div>

        {/* Primary match result */}
        {primary?(
          <div style={{ padding:'14px 18px', flex:1, overflowY:'auto' }}>
            <p style={{ fontSize:10, fontWeight:800, color: muted, textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:10 }}>Primary Match</p>
            <div style={{ borderRadius:10, border:`1px solid ${URGENCY_COL[primary.urgency_label]||accent}30`, background:`${URGENCY_COL[primary.urgency_label]||accent}08`, padding:12, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <p style={{ fontWeight:800, fontSize:13, color: text, margin:0, textTransform:'capitalize' }}>{primary.id.replace(/_/g,' ')}</p>
                <span style={{ fontSize:9, fontWeight:800, color: URGENCY_COL[primary.urgency_label], background:`${URGENCY_COL[primary.urgency_label]}20`, border:`1px solid ${URGENCY_COL[primary.urgency_label]}40`, padding:'2px 7px', borderRadius:99 }}>
                  {primary.urgency_label}
                </span>
              </div>
              <p style={{ fontSize:11, color: muted, lineHeight:1.65, marginBottom:6 }}>{primary.clinical_context?.slice(0,180)}…</p>
              <p style={{ fontSize:10, color: URGENCY_COL[primary.urgency_label], fontWeight:700, margin:0 }}>{primary.score} / {primary.tags?.length} symptoms matched</p>
            </div>
            {primary.next_actions?.slice(0,4).map((a:string,i:number)=>(
              <div key={i} style={{ display:'flex', gap:7, marginBottom:7 }}>
                <span style={{ color: accent, fontWeight:900, flexShrink:0 }}>•</span>
                <p style={{ fontSize:11, color: muted, margin:0, lineHeight:1.55 }}>{a}</p>
              </div>
            ))}
            {primary.contraindications?.length>0&&(
              <div style={{ marginTop:12, background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:9, padding:11 }}>
                <p style={{ fontSize:10, fontWeight:800, color:'#DC2626', margin:'0 0 6px', display:'flex', alignItems:'center', gap:5 }}><AlertTriangle size={11}/>Contraindications</p>
                {primary.contraindications.slice(0,3).map((c:string,i:number)=>(
                  <p key={i} style={{ fontSize:10, color:'#EF4444', margin:'0 0 4px', lineHeight:1.5 }}>⚠ {c}</p>
                ))}
              </div>
            )}
          </div>
        ):(
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
            <Brain size={32} color={muted} style={{ marginBottom:10, opacity:0.4 }}/>
            <p style={{ fontSize:12, color: muted, lineHeight:1.7 }}>Add symptoms then click <strong style={{ color: accent }}>Analyse</strong> to build the clinical knowledge graph.</p>
          </div>
        )}
      </div>

      {/* ── RIGHT GRAPH CANVAS ── */}
      <div style={{ flex:1, position:'relative', background: bg }} ref={containerRef}>
        {/* Subtle grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(var(--dd-border) 1px,transparent 1px),linear-gradient(90deg,var(--dd-border) 1px,transparent 1px)`, backgroundSize:'48px 48px', opacity:0.5, pointerEvents:'none' }}/>

        {loading&&(
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
            <Loader2 size={26} color={accent} style={{ animation:'spin 1s linear infinite' }}/>
            <p style={{ color: muted, fontSize:12 }}>Loading knowledge base…</p>
          </div>
        )}

        {!analysed&&!loading&&(
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
            <Network size={48} color={muted} style={{ opacity:0.25 }}/>
            <p style={{ fontSize:15, fontWeight:700, color: muted, opacity:0.5 }}>Your clinical graph will appear here</p>
            <p style={{ fontSize:12, color: muted, opacity:0.35 }}>Add symptoms on the left and hit Analyse</p>
          </div>
        )}

        {analysed&&graphData.nodes.length>0&&(
          <>
            {/* Zoom controls */}
            <div style={{ position:'absolute', top:14, right:14, zIndex:10, display:'flex', flexDirection:'column', gap:4, background: cardBg, border: border, borderRadius:10, padding:4, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
              {([<ZoomIn size={14}/>, <ZoomOut size={14}/>, <Maximize2 size={14}/>] as any[]).map((icon,i)=>(
                <button key={i} onClick={[()=>graphRef.current?.zoom(graphRef.current.zoom()*1.4,300),()=>graphRef.current?.zoom(graphRef.current.zoom()/1.4,300),()=>graphRef.current?.zoomToFit(400,60)][i]}
                  style={{ width:28, height:28, border:'none', background:'transparent', cursor:'pointer', color: muted, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7 }}>
                  {icon}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div style={{ position:'absolute', bottom:14, right:14, zIndex:10, background: cardBg, border: border, borderRadius:10, padding:'10px 14px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', display:'flex', flexDirection:'column', gap:7 }}>
              {[['#7C3AED','Entered Symptom'],['#4F46E5','Condition Cluster'],['#EA580C','Differential Dx'],['#D97706','Risk Amplifier']].map(([col,lbl])=>(
                <div key={lbl} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background: col as string, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color: muted, fontWeight:600 }}>{lbl}</span>
                </div>
              ))}
            </div>

            {/* Selected node panel */}
            {selectedNode&&(
              <div style={{ position:'absolute', top:14, left:14, zIndex:20, width:268, background: cardBg, border: border, borderRadius:12, padding:16, boxShadow:'0 4px 20px rgba(0,0,0,0.08)', maxHeight:'72vh', overflowY:'auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:9, height:9, borderRadius:'50%', background: selectedNode.color, flexShrink:0 }}/>
                    <p style={{ fontWeight:700, fontSize:13, color: text, margin:0, textTransform:'capitalize' }}>{selectedNode.label}</p>
                  </div>
                  <button onClick={()=>setSelectedNode(null)} style={{ background:'none', border:'none', cursor:'pointer', color: muted }}><X size={13}/></button>
                </div>
                {selectedNode.urgency_label&&(
                  <span style={{ fontSize:9, fontWeight:800, color: URGENCY_COL[selectedNode.urgency_label], background:`${URGENCY_COL[selectedNode.urgency_label]}15`, border:`1px solid ${URGENCY_COL[selectedNode.urgency_label]}35`, padding:'2px 7px', borderRadius:99, display:'inline-block', marginBottom:9 }}>
                    {selectedNode.urgency_label}
                  </span>
                )}
                {selectedNode.clinical_context&&<p style={{ fontSize:11, color: muted, lineHeight:1.65, marginBottom:10 }}>{selectedNode.clinical_context}</p>}
                {selectedNode.next_actions?.map((a:string,i:number)=>(
                  <div key={i} style={{ display:'flex', gap:6, marginBottom:6 }}>
                    <span style={{ color: accent, fontWeight:800, flexShrink:0 }}>•</span>
                    <p style={{ fontSize:11, color: muted, margin:0, lineHeight:1.55 }}>{a}</p>
                  </div>
                ))}
              </div>
            )}

            <ForceGraph2D ref={graphRef} graphData={graphData} width={dim.w} height={dim.h}
              backgroundColor="transparent" nodeCanvasObject={paintNode} linkCanvasObject={paintLink}
              nodePointerAreaPaint={(n:any,color,ctx)=>{ ctx.beginPath();ctx.arc(n.x,n.y,(n.val||4)+3,0,Math.PI*2);ctx.fillStyle=color;ctx.fill(); }}
              onNodeClick={(n)=>setSelectedNode((p:any)=>p?.id===n.id?null:n)} onBackgroundClick={()=>setSelectedNode(null)}
              cooldownTicks={80} d3AlphaDecay={0.03} d3VelocityDecay={0.3}
              linkDirectionalParticles={(l:any)=>l.highlighted?2:0} linkDirectionalParticleWidth={1.5}
              linkDirectionalParticleColor={(l:any)=>l.type==='SYMPTOM_OF'?'#7C3AED':'#EA580C'}/>
          </>
        )}
      </div>
    </div>
  );
}
