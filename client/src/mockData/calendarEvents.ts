export interface CalEvent {
  id: string;
  title: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // e.g. "05:00 pm"
  fullDateStr: string; // e.g. "May 3, 2016"
  colorBg: string;
  colorDot: string;
  rating: number;
}

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export const PALETTE = [
  { bg: '#86EFAC', dot: '#22C55E' }, // Green
  { bg: '#FDA4AF', dot: '#F43F5E' }, // Pink
  { bg: '#FDE047', dot: '#EAB308' }, // Yellow
  { bg: '#D8B4FE', dot: '#A855F7' }, // Purple
  { bg: '#93C5FD', dot: '#3B82F6' }, // Blue
];

export function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
export function toISO(y: number, m: number, d: number) { return `${y}-${pad(m+1)}-${pad(d)}`; }
export function formatTime(h: number, m: number) {
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return `${pad(hh)}:${pad(m)} ${ampm}`;
}

export const generateMockEvents = (year: number): CalEvent[] => {
  const seed: CalEvent[] = [];
  const titles = [
    'Patient Cardiology Follow-up', 
    'A very important MDT Meeting', 
    'Review Lab Results with Dr. Anna', 
    'Telehealth Consultation', 
    'Update Treatment Plan', 
    'Discharge Planning'
  ];
  
  for (let m = 0; m < 12; m++) {
    const numEvents = Math.floor(Math.random() * 4) + 2;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    
    let usedDays = new Set<number>();
    for (let i = 0; i < numEvents; i++) {
      let day = Math.floor(Math.random() * daysInMonth) + 1;
      while(usedDays.has(day)) {
        day = Math.floor(Math.random() * daysInMonth) + 1;
      }
      usedDays.add(day);
      
      const palette = PALETTE[(m + i) % PALETTE.length];
      seed.push({
        id: `ev-${year}-${m}-${i}`,
        title: titles[i % titles.length],
        dateStr: toISO(year, m, day),
        timeStr: formatTime(Math.floor(Math.random()*10)+8, (Math.floor(Math.random()*4)*15)),
        fullDateStr: `${MONTHS[m]} ${day}, ${year}`,
        colorBg: palette.bg,
        colorDot: palette.dot,
        rating: Math.floor(Math.random() * 3) + 3 
      });
    }
  }
  return seed.sort((a,b) => a.dateStr.localeCompare(b.dateStr));
};
