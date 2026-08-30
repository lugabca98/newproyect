import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { customFirebaseConfig } from './customFirebaseConfig';

const app = getApps().length === 0 ? initializeApp(customFirebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export const firebaseConfig = customFirebaseConfig;
export default app;
