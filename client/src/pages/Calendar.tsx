import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Trash2, Edit2 } from 'lucide-react';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PALETTE = [
  { bg: '#EEF2FF', dot: '#6366F1' },
  { bg: '#FDF2F8', dot: '#EC4899' },
  { bg: '#ECFDF5', dot: '#10B981' },
  { bg: '#FFFBEB', dot: '#F59E0B' },
  { bg: '#F0FDF4', dot: '#22C55E' },
];
const toISO = (y: number, m: number, d: number) => {
  const date = new Date(y, m, d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export type CalEvent = {
  id: string;
  title: string;
  dateStr: string;
  timeStr: string;
  fullDateStr: string;
  colorBg: string;
  colorDot: string;
  rating?: number;
};
import { apiFetch } from '../api/base';
import toast from 'react-hot-toast';

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  
  // Drawer states
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [form, setForm] = useState({ title: '', day: 1, timeStr: '09:00 am' });
  
  const fetchEvents = async () => {
    try {
      const res = await apiFetch<CalEvent[]>('/api/calendar');
      setEvents(res || []);
    } catch (err) {
      toast.error('Failed to load calendar tasks');
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const arr: { date: string; day: number; current: boolean }[] = [];
    
    for (let i = first - 1; i >= 0; i--) arr.push({ date: toISO(year, month - 1, daysInPrev - i), day: daysInPrev - i, current: false });
    for (let d = 1; d <= daysInMonth; d++) arr.push({ date: toISO(year, month, d), day: d, current: true });
    while (arr.length % 7 !== 0) {
      const extra = arr.length - first - daysInMonth + 1;
      arr.push({ date: toISO(year, month + 1, extra), day: extra, current: false });
    }
    return arr;
  }, [year, month]);

  const handleSave = async () => {
    if (!form.title) return;
    const day = Math.max(1, Math.min(form.day, new Date(year, month + 1, 0).getDate()));
    
    if (isEditing && selectedEvent) {
      // Update existing
      const updated = {
        title: form.title,
        dateStr: toISO(year, month, day),
        fullDateStr: `${MONTHS[month]} ${day}, ${year}`
      };
      
      try {
        const res = await apiFetch<CalEvent>(`/api/calendar/${selectedEvent.id}`, {
          method: 'PUT',
          body: JSON.stringify(updated)
        });
        setEvents(events.map(e => e.id === selectedEvent.id ? res : e));
        setIsEditing(false);
        setSelectedEvent(res);
        toast.success('Task updated');
      } catch (err) {
        toast.error('Failed to update task');
      }
    } else {
      // Create new
      const palette = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const newEv = {
        title: form.title,
        dateStr: toISO(year, month, day),
        timeStr: form.timeStr || '09:00 am',
        fullDateStr: `${MONTHS[month]} ${day}, ${year}`,
        colorBg: palette.bg,
        colorDot: palette.dot,
        rating: 5
      };
      
      try {
        const res = await apiFetch<CalEvent>('/api/calendar', {
          method: 'POST',
          body: JSON.stringify(newEv)
        });
        setEvents(prev => [...prev, res]);
        setShowAdd(false);
        toast.success('Task scheduled and reminder set');
      } catch (err) {
        toast.error('Failed to create task');
      }
    }
  };

  const openAdd = (day: number) => {
    setSelectedEvent(null);
    setIsEditing(false);
    setForm({ title: '', day, timeStr: '09:00 am' });
    setShowAdd(true);
  };

  const openEdit = () => {
    if (!selectedEvent) return;
    setForm({ 
      title: selectedEvent.title, 
      day: parseInt(selectedEvent.dateStr.split('-')[2]),
      timeStr: selectedEvent.timeStr 
    });
    setIsEditing(true);
  };

  const THEME = { bg: '#F1F5F9', card: '#FFFFFF', text: '#334155', textLight: '#64748B', border: '#E2E8F0', primary: '#8B5CF6', primaryHover: '#7C3AED' };

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', padding: '24px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', color: THEME.text }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>
            {MONTHS[month]} <span style={{ color: THEME.primary }}>{year}</span>
          </h1>
          <div style={{ display: 'flex', gap: '4px', background: THEME.card, padding: '4px', borderRadius: '10px', border: `1px solid ${THEME.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <button onClick={() => setMonth(m => m === 0 ? (setYear(y=>y-1), 11) : m - 1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', color: THEME.text }}><ChevronLeft size={18} /></button>
            <button onClick={() => { setMonth(new Date().getMonth()); setYear(new Date().getFullYear()); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 16px', fontSize: '13px', fontWeight: 600, color: THEME.text }}>Today</button>
            <button onClick={() => setMonth(m => m === 11 ? (setYear(y=>y+1), 0) : m + 1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', color: THEME.text }}><ChevronRight size={18} /></button>
          </div>
        </div>
        <button onClick={() => openAdd(1)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: THEME.primary, color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
          <Plus size={16} /> New Task
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: '24px' }}>
        
        {/* ── Calendar Main Grid ── */}
        <div style={{ flex: 1, minWidth: 0, background: THEME.card, borderRadius: '16px', border: `1px solid ${THEME.border}`, overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Days Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${THEME.border}`, background: '#F8FAFC', flexShrink: 0 }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: THEME.textLight, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{d}</div>
            ))}
          </div>

          {/* Days Grid - flex: 1 + gridAutoRows: 1fr forces perfectly even cards that fill exactly the available space */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', backgroundColor: THEME.border, gap: '1px' }}>
            {cells.map((cell, idx) => {
              const dayEvents = events.filter(e => e.dateStr === cell.date);
              const isToday = cell.date === toISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
              
              return (
                <div 
                  key={`${cell.date}-${idx}`} 
                  style={{ 
                    background: cell.current ? THEME.card : '#F8FAFC', 
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'background 0.2s',
                    cursor: cell.current ? 'pointer' : 'default',
                    overflow: 'hidden'
                  }}
                  onClick={() => cell.current && openAdd(cell.day)}
                  onMouseEnter={e => { if(cell.current) e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { if(cell.current) e.currentTarget.style.background = THEME.card; }}
                >
                  {/* Date Number */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' }}>
                    <span style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '24px', height: '24px', fontSize: '12px', 
                      fontWeight: isToday ? 700 : 500, 
                      color: cell.current ? (isToday ? '#fff' : THEME.text) : THEME.textLight,
                      background: isToday ? THEME.primary : 'transparent',
                      borderRadius: '50%',
                      boxShadow: isToday ? '0 2px 6px rgba(139,92,246,0.4)' : 'none'
                    }}>
                      {cell.day}
                    </span>
                  </div>
                  
                  {/* Events List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
                    {dayEvents.map(ev => (
                      <div 
                        key={ev.id} 
                        onClick={(e) => { e.stopPropagation(); setShowAdd(false); setIsEditing(false); setSelectedEvent(ev); }}
                        style={{ 
                          fontSize: '11px', padding: '4px 6px', borderRadius: '4px', 
                          background: `${ev.colorBg}25`, color: ev.colorDot, 
                          borderLeft: `2px solid ${ev.colorBg}`,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Side Panel Drawer (slides in next to calendar) ── */}
        {(showAdd || selectedEvent) && (
          <div style={{ 
            width: '320px', 
            background: THEME.card, 
            borderRadius: '16px', 
            border: `1px solid ${THEME.border}`, 
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', 
            padding: '24px', 
            display: 'flex', 
            flexDirection: 'column',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            flexShrink: 0
          }}>
            <style>{`@keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

            {/* Editing / Adding View */}
            {(showAdd || isEditing) ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: THEME.text }}>
                    {isEditing ? 'Edit Task' : 'Create New Task'}
                  </h3>
                  <button onClick={() => { setShowAdd(false); setIsEditing(false); }} style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', color: THEME.textLight, width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: THEME.textLight, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task Description</label>
                  <input placeholder="E.g., Patient Cardiology Follow-up" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} autoFocus style={{ width: '100%', padding: '12px', border: `1px solid ${THEME.border}`, borderRadius: '8px', boxSizing: 'border-box', outline: 'none', fontSize: '14px', background: '#F8FAFC' }} />
                </div>
                
                <div style={{ marginBottom: 'auto' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: THEME.textLight, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: `1px solid ${THEME.border}`, borderRadius: '8px', background: '#F8FAFC', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: THEME.text }}>{MONTHS[month]}</span>
                    <input type="number" value={form.day} onChange={e=>setForm({...form, day: parseInt(e.target.value)||1})} min={1} max={31} style={{ width: '60px', padding: '6px 10px', border: `1px solid ${THEME.border}`, borderRadius: '6px', outline: 'none', fontSize: '14px', fontWeight: 600 }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: THEME.text }}>{year}</span>
                  </div>

                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: THEME.textLight, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reminder Time</label>
                  <input type="time" value={(()=>{
                    const match = form.timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
                    if (!match) return '09:00';
                    let h = parseInt(match[1]);
                    const m = match[2];
                    const ampm = match[3].toLowerCase();
                    if (ampm === 'pm' && h < 12) h += 12;
                    if (ampm === 'am' && h === 12) h = 0;
                    return `${h.toString().padStart(2, '0')}:${m}`;
                  })()} onChange={e => {
                      const val = e.target.value;
                      if (!val) return;
                      const [h, m] = val.split(':');
                      const hour = parseInt(h);
                      const ampm = hour >= 12 ? 'pm' : 'am';
                      const formattedHour = hour % 12 || 12;
                      setForm({...form, timeStr: `${formattedHour < 10 ? '0'+formattedHour : formattedHour}:${m} ${ampm}`});
                  }} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${THEME.border}`, borderRadius: '8px', background: '#F8FAFC', outline: 'none', fontSize: '14px', fontWeight: 600, color: THEME.text, boxSizing: 'border-box' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                  <button onClick={() => { setShowAdd(false); setIsEditing(false); }} style={{ flex: 1, padding: '12px', background: '#F1F5F9', color: THEME.text, border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleSave} style={{ flex: 2, padding: '12px', background: THEME.primary, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)' }}>Save Task</button>
                </div>
              </>
            ) : selectedEvent ? (
              // Viewing View
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'flex-start' }}>
                  <div style={{ paddingRight: '16px' }}>
                    <div style={{ display: 'inline-block', padding: '4px 10px', background: `${selectedEvent.colorBg}25`, color: selectedEvent.colorDot, borderRadius: '20px', fontSize: '11px', fontWeight: 700, marginBottom: '12px', border: `1px solid ${selectedEvent.colorBg}` }}>Scheduled Task</div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>{selectedEvent.title}</h3>
                  </div>
                  <button onClick={() => setSelectedEvent(null)} style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', color: THEME.textLight, width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={16} /></button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 'auto', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: `1px solid ${THEME.border}` }}>
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <Clock size={20} color={THEME.primary} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: THEME.textLight, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Time & Date</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: THEME.text }}>{selectedEvent.fullDateStr} at {selectedEvent.timeStr}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                  <button onClick={async () => {
                    try {
                      await apiFetch(`/api/calendar/${selectedEvent.id}`, { method: 'DELETE' });
                      setEvents(events.filter(e => e.id !== selectedEvent.id));
                      setSelectedEvent(null);
                      toast.success('Task deleted');
                    } catch (err) {
                      toast.error('Failed to delete task');
                    }
                  }} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    <Trash2 size={15} /> Delete
                  </button>
                  <button onClick={openEdit} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', background: '#EEF2FF', color: THEME.primary, border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    <Edit2 size={15} /> Edit
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
