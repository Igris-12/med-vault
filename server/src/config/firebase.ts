import admin from 'firebase-admin';

if (!admin.apps.length) {
  // Use application default credentials or placeholder for dev
  if (process.env.NODE_ENV !== 'development') {
    admin.initializeApp();
  } else {
    admin.initializeApp({ projectId: 'demo-medvault' });
  }
}

export default admin;
