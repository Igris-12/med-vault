import admin from 'firebase-admin';

if (!admin.apps.length) {
  if (process.env.NODE_ENV === 'development') {
    // In dev: initialize with the real project ID so verifyIdToken attempts
    // the correct issuer check. If it still fails (no private key), auth.ts
    // will fall back to JWT payload decoding automatically.

  const projectId = process.env.FIREBASE_PROJECT_ID || 'medvault-4bbdc';

  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY.length > 50) {
    // Full service account credentials available (production)
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Development: use projectId only — sufficient for verifyIdToken()
    // Firebase Admin can verify tokens without a service account in this mode
    admin.initializeApp({ projectId });
  }
}

export default admin;
