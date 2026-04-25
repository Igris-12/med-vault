import admin from 'firebase-admin';

if (!admin.apps.length) {
  if (process.env.NODE_ENV === 'development') {
    // In dev: initialize with the real project ID so verifyIdToken attempts
    // the correct issuer check. If it still fails (no private key), auth.ts
    // will fall back to JWT payload decoding automatically.
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'medvault-4bbdc',
    });
  } else {
    // Production: must have GOOGLE_APPLICATION_CREDENTIALS or full service account
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      }),
    });
  }
}

export default admin;
