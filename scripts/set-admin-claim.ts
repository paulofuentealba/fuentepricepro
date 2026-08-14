import "dotenv/config";
import { getAdminAuth, isFirebaseAdminConfigured } from "../src/integrations/firebase/admin";

async function setAdminClaim() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error(
      "Usage: npx tsx scripts/set-admin-claim.ts <uid>\n" +
      "Example: npx tsx scripts/set-admin-claim.ts abc123def456"
    );
    process.exit(1);
  }

  const uid = args[0].trim();
  if (!uid) {
    console.error("Error: UID cannot be empty");
    process.exit(1);
  }

  console.log("[Set Admin Claim] Initializing...");

  if (!isFirebaseAdminConfigured()) {
    console.error("[Set Admin Claim] Error: Firebase Admin SDK is not configured. Missing credentials.");
    process.exit(1);
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    console.error("[Set Admin Claim] Error: Could not initialize Firebase Admin Auth.");
    process.exit(1);
  }

  try {
    // Check if user exists first
    await adminAuth.getUser(uid);
    console.log(`[Set Admin Claim] User ${uid} found. Setting isAdmin claim...`);

    await adminAuth.setCustomUserClaims(uid, { isAdmin: true });

    // Verify the claim was set
    const user = await adminAuth.getUser(uid);
    if (user.customClaims?.isAdmin === true) {
      console.log(`[Set Admin Claim] Success! isAdmin claim set for user ${uid}`);
      console.log("[Set Admin Claim] Note: User must refresh their ID token (logout/login or getIdToken(true)) for the claim to take effect.");
    } else {
      console.error("[Set Admin Claim] Warning: Claim may not have been set correctly. User customClaims:", user.customClaims);
      process.exit(1);
    }
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      console.error(`[Set Admin Claim] Error: User with UID "${uid}" not found in Firebase Auth.`);
    } else {
      console.error("[Set Admin Claim] Error setting admin claim:", error);
    }
    process.exit(1);
  }
}

setAdminClaim();