import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache(),
  });
} catch (error: any) {
  if (error.code === "failed-precondition" || error.message?.includes("already been called")) {
    dbInstance = getFirestore(app);
  } else {
    throw error;
  }
}
export const db = dbInstance;

// Never let local dev touch production Firestore/Auth: always redirect to the
// local emulators (see firebase.json). Guarded so Vite HMR re-executing this
// module doesn't try to connect twice.
if (import.meta.env.DEV) {
  const g = globalThis as { __firebaseEmulatorsConnected?: boolean };
  if (!g.__firebaseEmulatorsConnected) {
    g.__firebaseEmulatorsConnected = true;
    connectFirestoreEmulator(db, "localhost", 8080);
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  }
}
