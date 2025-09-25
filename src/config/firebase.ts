import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!cfg.projectId || !cfg.apiKey) {
  console.error("❌ Vars .env manquantes :", cfg);
} else {
  console.log("🔥 ENV OK ->", { projectId: cfg.projectId, region: import.meta.env.VITE_FUNCTIONS_REGION });
}

const app = getApps().length ? getApp() : initializeApp(cfg);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, import.meta.env.VITE_FUNCTIONS_REGION || 'europe-west1');
export const storage = getStorage(app);

console.log(`✅ Firebase initialisé (projectId=${cfg.projectId})`);