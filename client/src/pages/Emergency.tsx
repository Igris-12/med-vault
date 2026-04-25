import { useState } from 'react';
import { MOCK_USER } from '../mock';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

export default function Emergency() {
  const [bloodType, setBloodType] = useState(MOCK_USER.bloodType);
  const [allergies, setAllergies] = useState<string[]>(MOCK_USER.allergies);
  const [allergyInput, setAllergyInput] = useState('');
  const [saved, setSaved] = useState(false);

  const addAllergy = () => {
    const val = allergyInput.trim();
    if (val && !allergies.includes(val)) {
      setAllergies((prev) => [...prev, val]);
      setAllergyInput('');
    }
  };

  const removeAllergy = (a: string) => setAllergies((prev) => prev.filter((x) => x !== a));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const qrUrl = `http://localhost:3001/api/emergency/public/${MOCK_USER.emergencyToken}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-sans font-bold text-2xl text-text-primary">Emergency Card</h1>
        <p className="font-body text-sm text-text-muted mt-1">
          Your QR code gives first responders critical information without any app
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Edit form */}
        <div className="mv-card flex flex-col gap-5">
          <h2 className="section-title">Edit Emergency Info</h2>

          {/* Blood type */}
          <div>
            <label className="block font-body text-sm text-text-muted mb-2">Blood Type</label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_TYPES.map((bt) => (
                <button
                  key={bt}
                  onClick={() => setBloodType(bt as typeof bloodType)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono font-semibold transition-all
                    ${bloodType === bt
                      ? 'bg-coral text-coral-text'
                      : 'bg-surface border border-border-dim text-text-muted hover:border-coral/40'
                    }`}
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label className="block font-body text-sm text-text-muted mb-2">Allergies</label>
            <div className="flex gap-2 mb-3">
              <input
                className="mv-input flex-1"
                placeholder="e.g. Penicillin"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addAllergy(); }}
              />
              <button onClick={addAllergy} className="btn-ghost px-4">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allergies.map((a) => (
                <span key={a} className="badge-coral cursor-pointer hover:opacity-70"
                  onClick={() => removeAllergy(a)}>
                  {a} ✕
                </span>
              ))}
              {allergies.length === 0 && (
                <p className="font-body text-sm text-text-faint">No allergies recorded</p>
              )}
            </div>
          </div>

          {/* Emergency contacts */}
          <div>
            <label className="block font-body text-sm text-text-muted mb-2">Emergency Contacts</label>
            <div className="space-y-2">
              {MOCK_USER.emergencyContacts.map((c, i) => (
                <div key={i} className="bg-surface rounded-lg px-3 py-2.5">
                  <p className="font-body text-sm text-text-primary">{c.name}</p>
                  <p className="font-mono text-xs text-text-faint">{c.phone} · {c.relationship}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className={`btn-primary ${saved ? 'bg-teal-dark' : ''}`}
          >
            {saved ? '✓ Saved!' : 'Save Emergency Card'}
          </button>
        </div>

        {/* QR Card Preview */}
        <div className="flex flex-col gap-4">
          <h2 className="section-title">Card Preview</h2>

          {/* White card — intentionally light for physical-world use */}
          <div className="bg-white text-black rounded-2xl p-6 shadow-xl max-w-xs mx-auto w-full">
            <div className="text-center mb-4">
              <p className="font-sans font-bold text-lg">🚨 Emergency Medical Info</p>
              <p className="text-gray-600 text-sm">{MOCK_USER.name}</p>
            </div>

            <div className="bg-red-100 border-2 border-red-600 rounded-xl p-4 text-center mb-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Blood Type</p>
              <p className="font-mono font-black text-4xl text-red-700">{bloodType}</p>
            </div>

            {allergies.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-red-700 uppercase mb-1">⚠️ Allergies</p>
                {allergies.map((a) => (
                  <p key={a} className="font-mono text-sm text-red-700 font-semibold">{a}</p>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Emergency Contact</p>
              {MOCK_USER.emergencyContacts.slice(0, 1).map((c, i) => (
                <div key={i}>
                  <p className="font-sans text-sm font-semibold">{c.name}</p>
                  <p className="font-mono text-sm">{c.phone}</p>
                </div>
              ))}
            </div>

            {/* QR placeholder */}
            <div className="flex items-center justify-center mt-4 p-3 border border-gray-200 rounded-lg">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-3xl">📱</span>
                </div>
                <p className="text-xs text-gray-400 font-mono">Scan for full records</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
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

          <div className="mv-card">
            <p className="font-body text-xs text-text-muted leading-relaxed">
              <span className="text-teal font-semibold">Public URL: </span>
              <a href={qrUrl} target="_blank" rel="noreferrer" className="underline hover:text-teal break-all">
                {qrUrl}
              </a>
            </p>
            <p className="font-mono text-xs text-text-faint mt-2">
              This page works on any phone, 2G connection, without any app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
