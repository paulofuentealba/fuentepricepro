import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import fs from "node:fs";

let adminDbInstance: Firestore | null = null;

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

  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  try {
    if (getApps().length === 0) {
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
          initializeApp({
            credential: cert(creds),
            projectId,
          });
        } else {
          initializeApp({ projectId });
        }
      } else {
        initializeApp({ projectId });
      }
    }

    adminDbInstance = getFirestore();
    return adminDbInstance;
  } catch (error) {
    console.error("[Firebase Admin] Error initializing Firestore Admin SDK:", error);
    return null;
  }
}
