import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import fs from "node:fs";

let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;

function ensureAppInitialized(): boolean {
  if (getApps().length > 0) return true;
  if (!isFirebaseAdminConfigured()) return false;

  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    "fuente-price-pro";

  const serviceAccountVar =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountVar) {
    let creds: any = null;
    const trimmed = serviceAccountVar.trim();
    if (trimmed.startsWith("{")) {
      creds = JSON.parse(trimmed);
    } else if (fs.existsSync(trimmed)) {
      creds = JSON.parse(fs.readFileSync(trimmed, "utf-8"));
    }

    if (creds) {
      initializeApp({ credential: cert(creds), projectId });
    } else {
      initializeApp({ projectId });
    }
  } else {
    initializeApp({ projectId });
  }

  return true;
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.K_SERVICE ||
      process.env.GAE_ENV ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCP_PROJECT
  );
}

export function getAdminFirestore(): Firestore | null {
  if (adminDbInstance) return adminDbInstance;

  if (!ensureAppInitialized()) {
    return null;
  }

  try {
    adminDbInstance = getFirestore();
    return adminDbInstance;
  } catch (error) {
    console.error("[Firebase Admin] Error initializing Firestore Admin SDK:", error);
    return null;
  }
}

/**
 * Returns a memoized Firebase Admin Auth instance, initializing the Admin
 * SDK on first use (reusing the same app as `getAdminFirestore`).
 * Returns null if the Admin SDK is not configured (no credentials present).
 */
export function getAdminAuth(): Auth | null {
  if (adminAuthInstance) return adminAuthInstance;

  if (!ensureAppInitialized()) {
    return null;
  }

  try {
    // getApp() throws if no app is initialized; ensureAppInitialized() guards that.
    adminAuthInstance = getAuth(getApp());
    return adminAuthInstance;
  } catch (error) {
    console.error("[Firebase Admin] Error initializing Firebase Admin Auth:", error);
    return null;
  }
}
