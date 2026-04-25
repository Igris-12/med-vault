import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const MENU_CONTENT_SID = 'HXb7cae6e0cfd533f5d5534de2f479970f';

// ─── Plain text message ────────────────────────────────────────────────────────
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const formatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: formatted,
    body,
  });
}

// ─── Interactive List Picker (native dropdown menu) ───────────────────────────
export async function sendWhatsAppMenu(to: string): Promise<void> {
  const formatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: formatted,
    contentSid: MENU_CONTENT_SID,
  } as any);
}

// ─── Message with image / PDF attachment ─────────────────────────────────────
export async function sendWhatsAppWithMedia(
  to: string,
  body: string,
  mediaUrl: string
): Promise<void> {
  const formatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: formatted,
    body,
    mediaUrl: [mediaUrl],
  });
}
