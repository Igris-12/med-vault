import { apiFetch } from './base';

export interface UserProfile {
  _id: string;
  email: string;
  name: string;
  photoUrl: string | null;
  bloodType: string | null;
  dateOfBirth: string | null;
  allergies: string[];
  emergencyContacts: Array<{ name: string; phone: string; relationship: string }>;
  emergencyToken: string;
  whatsappPhone: string | null;
  modePreference: string;
  notificationPrefs: {
    delivered: boolean;
    failed: boolean;
    upcoming: boolean;
    marketing: boolean;
  };
  uiPrefs: {
    themeId: string;
    mode: string;
  };
}

/** Link a WhatsApp phone number to the current user */
export async function linkWhatsApp(phone: string): Promise<{ whatsappPhone: string }> {
  return apiFetch<{ whatsappPhone: string }>('/api/users/link-whatsapp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

/** Fetch the current user's full DB profile */
export async function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/users/profile');
}

/** Sync Firebase user to DB */
export async function syncProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/users/sync', { method: 'POST' });
}

/** Update the current user's profile fields */
export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
