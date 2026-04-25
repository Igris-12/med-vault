import { useState } from 'react';
import { MOCK_USER } from '../mock';
import type { BloodType } from '../types/api';

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

const BLOOD_TYPE_COLORS: Record<BloodType, string> = {
  'A+': 'bg-red-700', 'A-': 'bg-red-600',
  'B+': 'bg-orange-700', 'B-': 'bg-orange-600',
  'AB+': 'bg-purple-700', 'AB-': 'bg-purple-600',
  'O+': 'bg-rose-700', 'O-': 'bg-rose-600',
  'unknown': 'bg-gray-700',
};

// ─── Inline editable chip list ────────────────────────────────────────────────
function ChipList({
  items,
  onChange,
  placeholder,
  chipClass = 'badge-coral',
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  chipClass?: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const val = input.trim();
    if (val && !items.includes(val)) {
      onChange([...items, val]);
      setInput('');
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChange(items.filter((x) => x !== item))}
          className={`${chipClass} cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-1`}
          title="Click to remove"
        >
          {item}
          <span className="text-xs opacity-60">✕</span>
        </button>
      ))}
      <div className="flex items-center gap-1.5">
        <input
          className="bg-surface border border-border-mid rounded-lg px-3 py-1 text-sm font-body
                     text-text-primary placeholder-text-faint focus:outline-none focus:border-teal
                     focus:ring-1 focus:ring-teal/30 w-32 transition-all"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        />
        <button
          onClick={add}
          className="w-7 h-7 rounded-full bg-teal/20 text-teal hover:bg-teal/30 text-sm flex items-center justify-center transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mv-card flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-border-dim pb-3">
        <span className="text-lg">{icon}</span>
        <h2 className="section-title">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── QR Card Preview ──────────────────────────────────────────────────────────
function QRPreview({
  name,
  bloodType,
  allergies,
  contacts,
}: {
  name: string;
  bloodType: BloodType;
  allergies: string[];
  contacts: typeof MOCK_USER.emergencyContacts;
}) {
  const btColor = BLOOD_TYPE_COLORS[bloodType];

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[320px] mx-auto select-none">
      {/* Header band */}
      <div className="bg-red-700 text-white px-5 py-3 flex items-center gap-2">
        <span className="text-lg">🚨</span>
        <div>
          <p className="font-bold text-sm tracking-wide">EMERGENCY INFO</p>
          <p className="text-xs opacity-80">{name}</p>
        </div>
      </div>

      {/* Blood type hero */}
      <div className={`${btColor} text-white text-center py-5`}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70 mb-1">Blood Type</p>
        <p className="font-black text-6xl tracking-tight">{bloodType}</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Allergies */}
        {allergies.length > 0 ? (
          <div>
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">⚠ Allergies</p>
            <div className="flex flex-wrap gap-1">
              {allergies.map((a) => (
                <span key={a} className="text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                  {a}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No known allergies</p>
        )}

        {/* Contact */}
        {contacts.slice(0, 1).map((c, i) => (
          <div key={i} className="border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Emergency Contact</p>
            <p className="text-sm font-bold text-gray-800">{c.name}</p>
            <p className="text-sm font-mono text-gray-600">{c.phone}</p>
            <p className="text-xs text-gray-400">{c.relationship}</p>
          </div>
        ))}

        {/* QR placeholder */}
        <div className="border-t border-gray-100 pt-3 flex items-center gap-3">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
            📱
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Full Records</p>
            <p className="text-xs text-gray-400 mt-0.5">Scan QR for complete medical history</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 px-4 py-2 text-center">
        <p className="text-xs text-gray-400">Generated by MedVault</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Emergency() {
  const [bloodType, setBloodType] = useState<BloodType>(MOCK_USER.bloodType);
  const [allergies, setAllergies] = useState<string[]>(MOCK_USER.allergies);
  const [contacts, setContacts] = useState(MOCK_USER.emergencyContacts);
  const [saved, setSaved] = useState(false);

  const qrUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/emergency/public/${MOCK_USER.emergencyToken}`;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl text-text-primary flex items-center gap-2">
            🆘 Emergency Card
          </h1>
          <p className="font-body text-sm text-text-muted mt-1">
            Scan a QR code to give first responders critical information — no app needed
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`btn-primary flex-shrink-0 transition-all ${saved ? 'bg-teal-dark' : ''}`}
        >
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Left: Edit panel ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Blood type */}
          <Section title="Blood Type" icon="🩸">
            <div className="flex flex-wrap gap-2">
              {BLOOD_TYPES.map((bt) => (
                <button
                  key={bt}
                  onClick={() => setBloodType(bt)}
                  className={`
                    w-14 h-14 rounded-xl font-mono font-black text-sm transition-all duration-150
                    ${bloodType === bt
                      ? `${BLOOD_TYPE_COLORS[bt]} text-white shadow-lg scale-105`
                      : 'bg-surface border border-border-mid text-text-muted hover:border-coral/40'
                    }
                  `}
                >
                  {bt}
                </button>
              ))}
            </div>
            <p className="font-body text-xs text-text-faint">
              This will be shown prominently to first responders
            </p>
          </Section>

          {/* Allergies */}
          <Section title="Allergies" icon="⚠️">
            <ChipList
              items={allergies}
              onChange={setAllergies}
              placeholder="e.g. Penicillin"
              chipClass="badge-coral"
            />
            <p className="font-body text-xs text-text-faint">
              Click a chip to remove it · Press Enter to add
            </p>
          </Section>

          {/* Emergency contacts */}
          <Section title="Emergency Contacts" icon="📞">
            <div className="space-y-3">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3 border border-border-dim">
                  <div className="w-9 h-9 rounded-full bg-teal/15 flex items-center justify-center text-teal font-bold text-sm flex-shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-text-primary truncate">{c.name}</p>
                    <p className="font-mono text-xs text-text-muted">{c.phone}</p>
                    <p className="font-body text-xs text-text-faint">{c.relationship}</p>
                  </div>
                  <button
                    onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                    className="text-text-faint hover:text-coral transition-colors text-sm p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => setContacts([...contacts, { name: 'New Contact', phone: '+91-', relationship: 'Family' }])}
                className="w-full btn-ghost text-sm"
              >
                + Add Contact
              </button>
            </div>
          </Section>

          {/* QR actions */}
          <Section title="QR Code Access" icon="📱">
            <div className="flex flex-col gap-3">
              <div className="bg-surface rounded-xl px-4 py-3 border border-border-dim">
                <p className="font-body text-xs text-text-muted mb-1">Public emergency URL</p>
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-teal hover:text-teal-dark break-all transition-colors"
                >
                  {qrUrl}
                </a>
              </div>
              <p className="font-body text-xs text-text-faint">
                Works on any phone with 2G connection — no app, no login required
              </p>
              <div className="flex gap-3">
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/emergency/qr-image`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost flex-1 text-center text-sm"
                >
                  📥 Download QR
                </a>
                <button onClick={() => window.print()} className="btn-ghost flex-1 text-sm">
                  🖨️ Print Card
                </button>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Right: Live preview ───────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-5">
          <div className="mv-card w-full flex flex-col items-center gap-4 sticky top-6">
            <div className="flex items-center justify-between w-full">
              <h2 className="section-title">Live Preview</h2>
              <span className="badge-teal text-xs">● Updates in real time</span>
            </div>
            <QRPreview
              name={MOCK_USER.name}
              bloodType={bloodType}
              allergies={allergies}
              contacts={contacts}
            />
            <p className="font-body text-xs text-text-faint text-center">
              This is how the card appears to emergency responders
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
