import { apiFetch } from './base';

export async function linkWhatsApp(phone: string): Promise<{ whatsappPhone: string }> {
  return apiFetch<{ whatsappPhone: string }>('/api/users/link-whatsapp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}
