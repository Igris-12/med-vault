export type Specialty =
  | 'Cardiology'
  | 'Orthopedics'
  | 'Neurology'
  | 'Endocrinology'
  | 'Nephrology'
  | 'Oncology'
  | 'Ophthalmology'
  | 'General Medicine'
  | 'Pediatrics'
  | 'Dermatology'
  | 'Gynecology'
  | 'Psychiatry';

export interface Hospital {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'diagnostic' | 'pharmacy';
  address: string;
  area: string;
  lat: number;
  lng: number;
  phone: string;
  emergencyAvailable: boolean;
  rating: number;
  bedCount?: number;
  specialties: Specialty[];
  timings: string;
  distanceKm: number;
  website?: string;
}

// Demo fallback location — Panaji, Goa
export const MOCK_USER_LOCATION = {
  lat: 15.4909,
  lng: 73.8278,
  label: 'Panaji, Goa',
};

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 'h-001',
    name: 'Goa Medical College & Hospital',
    type: 'hospital',
    address: 'Bambolim, North Goa',
    area: 'Bambolim',
    lat: 15.4576,
    lng: 73.8347,
    phone: '+91-832-245-8700',
    emergencyAvailable: true,
    rating: 4.0,
    bedCount: 1800,
    specialties: ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Nephrology'],
    timings: '24 hours (Government Hospital)',
    distanceKm: 3.7,
    website: 'https://gmc.goa.gov.in',
  },
  {
    id: 'h-002',
    name: 'Manipal Hospitals Goa',
    type: 'hospital',
    address: 'El-Don Building, 17-B, Menezes Braganza Road, Panaji',
    area: 'Panaji',
    lat: 15.4989,
    lng: 73.8278,
    phone: '+91-832-246-6666',
    emergencyAvailable: true,
    rating: 4.5,
    bedCount: 350,
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Endocrinology', 'Nephrology', 'Oncology'],
    timings: '24 hours',
    distanceKm: 0.9,
    website: 'https://www.manipalhospitals.com/goa',
  },
  {
    id: 'h-003',
    name: 'Apollo Clinic Panaji',
    type: 'clinic',
    address: 'Mahalaxmi Chambers, DB Bandodkar Marg, Panaji',
    area: 'Panaji',
    lat: 15.4927,
    lng: 73.8259,
    phone: '+91-832-222-2424',
    emergencyAvailable: false,
    rating: 4.4,
    specialties: ['General Medicine', 'Endocrinology', 'Cardiology', 'Pediatrics'],
    timings: 'Mon–Sat 8am–8pm · Sun 9am–2pm',
    distanceKm: 0.4,
  },
  {
    id: 'h-004',
    name: 'Healthway Hospital',
    type: 'hospital',
    address: 'Chimbel, Goa Velha Road, Chimbel',
    area: 'Chimbel',
    lat: 15.4720,
    lng: 73.8561,
    phone: '+91-832-241-2345',
    emergencyAvailable: true,
    rating: 4.2,
    bedCount: 180,
    specialties: ['General Medicine', 'Orthopedics', 'Gynecology', 'Pediatrics'],
    timings: '24 hours',
    distanceKm: 4.1,
  },
  {
    id: 'h-005',
    name: 'Vrundavan Hospital',
    type: 'hospital',
    address: 'Mapusa, North Goa',
    area: 'Mapusa',
    lat: 15.5918,
    lng: 73.8143,
    phone: '+91-832-226-3456',
    emergencyAvailable: true,
    rating: 4.1,
    bedCount: 120,
    specialties: ['General Medicine', 'Cardiology', 'Orthopedics'],
    timings: '24 hours',
    distanceKm: 11.2,
  },
  {
    id: 'h-006',
    name: 'Asilo Hospital',
    type: 'hospital',
    address: 'Hospital Road, Mapusa',
    area: 'Mapusa',
    lat: 15.5933,
    lng: 73.8124,
    phone: '+91-832-226-2372',
    emergencyAvailable: true,
    rating: 3.9,
    bedCount: 200,
    specialties: ['General Medicine', 'Gynecology', 'Pediatrics', 'Orthopedics'],
    timings: '24 hours',
    distanceKm: 11.4,
  },
  {
    id: 'h-007',
    name: 'North Goa District Hospital',
    type: 'hospital',
    address: 'Mapusa, North Goa',
    area: 'Mapusa',
    lat: 15.5950,
    lng: 73.8099,
    phone: '+91-832-226-2372',
    emergencyAvailable: true,
    rating: 3.8,
    bedCount: 400,
    specialties: ['General Medicine', 'Orthopedics', 'Gynecology', 'Pediatrics'],
    timings: '24 hours (Government)',
    distanceKm: 11.7,
  },
  {
    id: 'h-008',
    name: 'Dr. João de Deus PHC',
    type: 'clinic',
    address: 'Altinho, Panaji',
    area: 'Panaji',
    lat: 15.4942,
    lng: 73.8318,
    phone: '+91-832-222-5801',
    emergencyAvailable: false,
    rating: 4.0,
    specialties: ['General Medicine', 'Pediatrics'],
    timings: 'Mon–Sat 9am–5pm',
    distanceKm: 0.6,
  },
  {
    id: 'h-009',
    name: 'Panaji Community Health Centre',
    type: 'clinic',
    address: 'St. Inez, Panaji',
    area: 'St. Inez',
    lat: 15.4882,
    lng: 73.8364,
    phone: '+91-832-222-6100',
    emergencyAvailable: false,
    rating: 3.9,
    specialties: ['General Medicine', 'Gynecology', 'Pediatrics'],
    timings: 'Mon–Sat 8am–4pm',
    distanceKm: 0.8,
  },
  {
    id: 'h-010',
    name: 'Medway Hospital',
    type: 'hospital',
    address: 'Porvorim, North Goa',
    area: 'Porvorim',
    lat: 15.5139,
    lng: 73.8268,
    phone: '+91-832-241-9999',
    emergencyAvailable: true,
    rating: 4.3,
    bedCount: 80,
    specialties: ['General Medicine', 'Orthopedics', 'Cardiology'],
    timings: '24 hours',
    distanceKm: 2.6,
  },
  {
    id: 'h-011',
    name: 'MedPlus Pharmacy — Panaji',
    type: 'pharmacy',
    address: 'Near KTC Bus Stand, Panaji',
    area: 'Panaji',
    lat: 15.4965,
    lng: 73.8281,
    phone: '+91-40-6767-6767',
    emergencyAvailable: false,
    rating: 4.3,
    specialties: [],
    timings: 'Mon–Sun 8am–11pm',
    distanceKm: 0.7,
  },
  {
    id: 'h-012',
    name: 'Apollo Pharmacy — Panaji',
    type: 'pharmacy',
    address: 'Dayanand Bandodkar Marg, Panaji',
    area: 'Panaji',
    lat: 15.4935,
    lng: 73.8265,
    phone: '+91-832-242-0000',
    emergencyAvailable: false,
    rating: 4.5,
    specialties: [],
    timings: 'Mon–Sun 7am–midnight',
    distanceKm: 0.3,
  },
  {
    id: 'h-013',
    name: 'Goa Diagnostic Centre',
    type: 'diagnostic',
    address: 'Patto Plaza, Panaji',
    area: 'Panaji',
    lat: 15.4918,
    lng: 73.8355,
    phone: '+91-832-243-9000',
    emergencyAvailable: false,
    rating: 4.4,
    specialties: ['General Medicine'],
    timings: 'Mon–Sat 7am–8pm · Sun 8am–1pm',
    distanceKm: 1.0,
  },
  {
    id: 'h-014',
    name: 'Shree Sai Hospital',
    type: 'hospital',
    address: 'Vasco da Gama, South Goa',
    area: 'Vasco da Gama',
    lat: 15.3980,
    lng: 73.8116,
    phone: '+91-832-251-0246',
    emergencyAvailable: true,
    rating: 4.0,
    bedCount: 100,
    specialties: ['General Medicine', 'Orthopedics', 'Gynecology'],
    timings: '24 hours',
    distanceKm: 10.8,
  },
  {
    id: 'h-015',
    name: 'Dr. Nagvekar Endocrinology Clinic',
    type: 'clinic',
    address: 'Miramar, Panaji',
    area: 'Miramar',
    lat: 15.4741,
    lng: 73.8062,
    phone: '+91-98221-34567',
    emergencyAvailable: false,
    rating: 4.8,
    specialties: ['Endocrinology', 'General Medicine'],
    timings: 'Mon–Fri 10am–2pm, 5pm–8pm · Sat 10am–2pm',
    distanceKm: 2.1,
  },
];

export const ALL_SPECIALTIES: Specialty[] = [
  'Cardiology', 'Endocrinology', 'Nephrology', 'Neurology',
  'Orthopedics', 'Oncology', 'Ophthalmology',
  'General Medicine', 'Pediatrics', 'Gynecology', 'Dermatology', 'Psychiatry',
];
