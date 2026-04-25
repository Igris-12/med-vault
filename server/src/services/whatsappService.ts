import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  // `to` can be either a raw E.164 number or already prefixed with "whatsapp:"
  const formatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: formatted,
    body,
  });
}

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
