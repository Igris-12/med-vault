import type { MedUser } from '../types/api';

export const MOCK_USER: MedUser = {
  _id: 'dev-user-001',
  email: 'priya.sharma@example.com',
  name: 'Priya Sharma',
  photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
  bloodType: 'B+',
  dateOfBirth: '1986-03-14T00:00:00.000Z',
  allergies: ['Penicillin', 'Sulfa drugs'],
  emergencyContacts: [
    { name: 'Rahul Sharma', phone: '+91-98765-43210', relationship: 'Husband' },
    { name: 'Dr. Meena Kapoor', phone: '+91-99001-12345', relationship: 'Primary Physician' },
  ],
  emergencyToken: 'demo-emergency-token-priya-2024',
  modePreference: 'patient',
  createdAt: '2022-01-15T10:30:00.000Z',
};
