/**
 * Mock doctor data per hospital — structured to match what a
 * real Practo / NHA ABDM API would return.
 */
export interface Doctor {
  id: string;
  hospitalId: string; // matches Hospital.id or NearbyPlace.id
  name: string;
  specialty: string;
  qualification: string;
  experienceYears: number;
  rating: number;       // 1-5
  reviewCount: number;
  nextAvailable: string; // e.g. "Today 4:30 PM"
  consultationFee: number; // INR
  languages: string[];
  source: string; // "Practo" | "NHM" | "Hospital Website"
}

export const MOCK_DOCTORS: Doctor[] = [
  // Manipal Hospitals Goa (h-002)
  { id: 'd-001', hospitalId: 'h-002', name: 'Dr. Suresh Nair', specialty: 'Cardiology', qualification: 'MD, DM (Cardiology), AIIMS Delhi', experienceYears: 18, rating: 4.8, reviewCount: 312, nextAvailable: 'Today 5:00 PM', consultationFee: 800, languages: ['English', 'Hindi', 'Konkani'], source: 'Practo' },
  { id: 'd-002', hospitalId: 'h-002', name: 'Dr. Kavita Dessai', specialty: 'Endocrinology', qualification: 'MD (Medicine), DNB (Endocrinology)', experienceYears: 12, rating: 4.9, reviewCount: 198, nextAvailable: 'Tomorrow 10:00 AM', consultationFee: 700, languages: ['English', 'Konkani', 'Marathi'], source: 'Practo' },
  { id: 'd-003', hospitalId: 'h-002', name: 'Dr. Rajan Shetty', specialty: 'Nephrology', qualification: 'MD, DM (Nephrology)', experienceYears: 15, rating: 4.7, reviewCount: 145, nextAvailable: 'Today 6:30 PM', consultationFee: 900, languages: ['English', 'Hindi', 'Kannada'], source: 'Practo' },
  { id: 'd-004', hospitalId: 'h-002', name: 'Dr. Anita Borkar', specialty: 'Neurology', qualification: 'MD, DM (Neurology), Manipal', experienceYears: 10, rating: 4.6, reviewCount: 88, nextAvailable: 'Thu 11:00 AM', consultationFee: 750, languages: ['English', 'Konkani'], source: 'Practo' },

  // Apollo Clinic Panaji (h-003)
  { id: 'd-005', hospitalId: 'h-003', name: 'Dr. Pradeep Kamat', specialty: 'General Medicine', qualification: 'MBBS, MD (Internal Medicine)', experienceYears: 20, rating: 4.7, reviewCount: 540, nextAvailable: 'Today 3:00 PM', consultationFee: 500, languages: ['English', 'Konkani', 'Hindi'], source: 'Hospital Website' },
  { id: 'd-006', hospitalId: 'h-003', name: 'Dr. Sneha Vaigankar', specialty: 'Endocrinology', qualification: 'MBBS, DNB, Fellowship Endocrinology', experienceYears: 8, rating: 4.8, reviewCount: 210, nextAvailable: 'Today 6:00 PM', consultationFee: 600, languages: ['English', 'Konkani'], source: 'Practo' },
  { id: 'd-007', hospitalId: 'h-003', name: 'Dr. Rahul Prabhu', specialty: 'Pediatrics', qualification: 'MBBS, MD (Pediatrics)', experienceYears: 14, rating: 4.5, reviewCount: 320, nextAvailable: 'Tomorrow 9:00 AM', consultationFee: 450, languages: ['English', 'Konkani', 'Marathi'], source: 'Practo' },

  // Goa Medical College (h-001)
  { id: 'd-008', hospitalId: 'h-001', name: 'Dr. Ashok Velip', specialty: 'Cardiology', qualification: 'MD, DM (Cardiology), GMC Goa', experienceYears: 22, rating: 4.6, reviewCount: 180, nextAvailable: 'Fri 10:00 AM', consultationFee: 100, languages: ['English', 'Konkani', 'Hindi'], source: 'NHM' },
  { id: 'd-009', hospitalId: 'h-001', name: 'Dr. Lata Naik', specialty: 'Nephrology', qualification: 'MD, DM (Nephrology)', experienceYears: 16, rating: 4.5, reviewCount: 95, nextAvailable: 'Wed 11:00 AM', consultationFee: 100, languages: ['English', 'Konkani'], source: 'NHM' },
  { id: 'd-010', hospitalId: 'h-001', name: 'Dr. Francis D\'Souza', specialty: 'Orthopedics', qualification: 'MS (Ortho), MCh', experienceYears: 25, rating: 4.4, reviewCount: 210, nextAvailable: 'Today 2:00 PM', consultationFee: 100, languages: ['English', 'Konkani', 'Portuguese'], source: 'NHM' },

  // Healthway Hospital (h-004)
  { id: 'd-011', hospitalId: 'h-004', name: 'Dr. Swapna Lotlikar', specialty: 'Gynecology', qualification: 'MBBS, MS (OBG)', experienceYears: 13, rating: 4.7, reviewCount: 430, nextAvailable: 'Today 5:30 PM', consultationFee: 600, languages: ['English', 'Konkani', 'Marathi'], source: 'Practo' },
  { id: 'd-012', hospitalId: 'h-004', name: 'Dr. Nilesh Sawant', specialty: 'General Medicine', qualification: 'MBBS, MD', experienceYears: 9, rating: 4.4, reviewCount: 155, nextAvailable: 'Tomorrow 8:00 AM', consultationFee: 400, languages: ['English', 'Konkani', 'Hindi'], source: 'Hospital Website' },

  // Dr. Nagvekar Endocrinology Clinic (h-015)
  { id: 'd-013', hospitalId: 'h-015', name: 'Dr. Vinay Nagvekar', specialty: 'Endocrinology', qualification: 'MD, DNB, MRCP (UK)', experienceYears: 19, rating: 4.9, reviewCount: 612, nextAvailable: 'Today 7:00 PM', consultationFee: 900, languages: ['English', 'Konkani', 'Hindi', 'Marathi'], source: 'Practo' },

  // Medway Hospital (h-010)
  { id: 'd-014', hospitalId: 'h-010', name: 'Dr. Sanjay Ghadi', specialty: 'Cardiology', qualification: 'MD, DM (Cardiology)', experienceYears: 11, rating: 4.5, reviewCount: 98, nextAvailable: 'Today 4:00 PM', consultationFee: 650, languages: ['English', 'Hindi', 'Konkani'], source: 'Practo' },

  // Kidwai Memorial (h-015 is Nagvekar, h-015 already used)
  { id: 'd-015', hospitalId: 'h-014', name: 'Dr. Meenakshi Tendulkar', specialty: 'General Medicine', qualification: 'MBBS, MD (Internal Medicine)', experienceYears: 17, rating: 4.3, reviewCount: 200, nextAvailable: 'Wed 9:30 AM', consultationFee: 500, languages: ['English', 'Konkani', 'Marathi'], source: 'Hospital Website' },
];

/** Get doctors for a given hospitalId (from mock or OSM-sourced place) */
export function getDoctorsForHospital(hospitalId: string): Doctor[] {
  return MOCK_DOCTORS.filter((d) => d.hospitalId === hospitalId);
}
