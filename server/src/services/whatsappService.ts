import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// TWILIO_WHATSAPP_FROM already includes 'whatsapp:' prefix in .env
const FROM = process.env.TWILIO_WHATSAPP_FROM!;

function formatTo(to: string): string {
  return to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
}

// ─── Plain text message ────────────────────────────────────────────────────────
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  await client.messages.create({
    from: FROM,
    to: formatTo(to),
    body,
  });
}

// ─── Interactive List Picker (main menu via Content Template) ─────────────────
export async function sendWhatsAppMenu(to: string): Promise<void> {
  await client.messages.create({
    from: FROM,
    to: formatTo(to),
    contentSid: process.env.TWILIO_MENU_CONTENT_SID!,
    contentVariables: JSON.stringify({}),
  } as any);
}

// ─── Emergency Card (text template with {{1}}…{{5}} variables) ────────────────
export async function sendEmergencyTemplate(
  to: string,
  name: string,
  bloodType: string,
  allergies: string,
  medications: string,
  emergencyContact: string
): Promise<void> {
  await client.messages.create({
    from: FROM,
    to: formatTo(to),
    contentSid: process.env.TWILIO_EMERGENCY_TEMPLATE_SID!,
    contentVariables: JSON.stringify({
      '1': name,
      '2': bloodType,
      '3': allergies,
      '4': medications,
      '5': emergencyContact,
    }),
  } as any);
}

// ─── Message with image / PDF attachment ──────────────────────────────────────
export async function sendWhatsAppWithMedia(
  to: string,
  body: string,
  mediaUrl: string
): Promise<void> {
  await client.messages.create({
    from: FROM,
    to: formatTo(to),
    body,
    mediaUrl: [mediaUrl],
  });
}
