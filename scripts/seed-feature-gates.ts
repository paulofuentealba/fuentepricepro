import "dotenv/config";
import { getAdminFirestore, isFirebaseAdminConfigured } from "../src/integrations/firebase/admin";
import { DEFAULT_FEATURE_GATES } from "../src/lib/featureGates";

async function seedFeatureGates() {
  console.log("[Seed Feature Gates] Initializing...");

  if (!isFirebaseAdminConfigured()) {
    console.error("[Seed Feature Gates] Error: Firebase Admin SDK is not configured. Missing credentials.");
    process.exit(1);
  }

  const db = getAdminFirestore();
  if (!db) {
    console.error("[Seed Feature Gates] Error: Could not initialize Firestore Admin instance.");
    process.exit(1);
  }

  const docRef = db.collection("config").doc("featureGates");

  try {
    const snapshot = await docRef.get();
    if (snapshot.exists) {
      console.log("[Seed Feature Gates] Document 'config/featureGates' already exists. Skipping seed (idempotent).");
      console.log("Current data:", snapshot.data());
    } else {
      const payload = {
        ...DEFAULT_FEATURE_GATES,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await docRef.set(payload);
      console.log("[Seed Feature Gates] Successfully created 'config/featureGates' with payload:", payload);
    }
  } catch (error) {
    console.error("[Seed Feature Gates] Error seeding document:", error);
    process.exit(1);
  }
}

seedFeatureGates();
