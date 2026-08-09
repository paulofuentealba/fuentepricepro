import "dotenv/config";
import { getAdminFirestore, isFirebaseAdminConfigured } from "../src/integrations/firebase/admin";

const PERMISSIVE_FEATURE_GATES = {
  freeAssetLimit: 999999,
  cashflowUnlocked: true,
  smartAllocationUnlocked: true,
  customTaxUnlocked: true,
  sliderUnlocked: true,
  strategiesUnlocked: true,
  updatedAt: new Date().toISOString(),
};

async function updateFeatureGatesPermissive() {
  console.log("[Update Feature Gates Permissive] Initializing...");

  if (!isFirebaseAdminConfigured()) {
    console.error("[Update Feature Gates Permissive] Error: Firebase Admin SDK is not configured.");
    process.exit(1);
  }

  const db = getAdminFirestore();
  if (!db) {
    console.error("[Update Feature Gates Permissive] Error: Could not initialize Firestore Admin instance.");
    process.exit(1);
  }

  const docRef = db.collection("config").doc("featureGates");

  try {
    const snapshot = await docRef.get();
    const existingData = snapshot.exists ? snapshot.data() : {};
    
    console.log("[Update Feature Gates Permissive] Existing config/featureGates data:", existingData);

    await docRef.set(
      {
        ...existingData,
        ...PERMISSIVE_FEATURE_GATES,
      },
      { merge: true }
    );

    const updatedSnapshot = await docRef.get();
    console.log("[Update Feature Gates Permissive] Successfully updated 'config/featureGates' with:", updatedSnapshot.data());
  } catch (error) {
    console.error("[Update Feature Gates Permissive] Error updating document:", error);
    process.exit(1);
  }
}

updateFeatureGatesPermissive();
