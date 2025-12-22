import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton pattern)
const getFirebaseAdmin = () => {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    // Check for required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.warn('Firebase Admin SDK not initialized: Missing credentials');
        console.warn('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        return null;
    }

    try {
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                // Handle the escaped newlines in the private key
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
        });

        console.log('Firebase Admin SDK initialized successfully');
        return app;
    } catch (error) {
        console.error('Failed to initialize Firebase Admin SDK:', error);
        return null;
    }
};

export const firebaseAdmin = getFirebaseAdmin();
export const messaging = firebaseAdmin ? admin.messaging() : null;

export default firebaseAdmin;
