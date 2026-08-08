/**
 * Firestore Security Rules Behavioral Verification Suite
 * 
 * Tests the security constraints in `firestore.rules` against the local Firestore Emulator.
 * 
 * EXECUTION:
 * Run `npm run test:rules` to launch the Firestore emulator and execute this test suite.
 * 
 * CONSTRAINTS VERIFIED:
 * 1. DENIES client updateDoc trying to set subscriptionStatus or stripeCustomerId.
 * 2. ALLOWS client updating legitimate user fields (settings, investorProfile, issuerTickerMappings).
 * 3. ALLOWS initial user doc creation without protected fields, but DENIES creation with subscriptionStatus.
 * 4. ALLOWS Admin SDK context (security rules disabled) to read and write subscriptionStatus / stripeCustomerId.
 */

import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import fs from "node:fs";
import path from "node:path";
import { doc, setDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "fuente-price-pro-test";

describe.runIf(Boolean(process.env.FIRESTORE_EMULATOR_HOST))(
  "Firestore Security Rules Verification Suite",
  () => {
    let testEnv: RulesTestEnvironment;

    beforeAll(async () => {
      const rulesPath = path.resolve(__dirname, "../../../firestore.rules");
      const rules = fs.readFileSync(rulesPath, "utf8");

      testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
          rules,
          host: "127.0.0.1",
          port: 8080,
        },
      });
    });

    beforeEach(async () => {
      await testEnv.clearFirestore();
    });

    afterAll(async () => {
      await testEnv.cleanup();
    });

    it("1. DENIES authenticated client updateDoc adding or updating subscriptionStatus or stripeCustomerId", async () => {
      const aliceUid = "alice123";
      
      // Seed alice doc without protected fields
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "users", aliceUid), {
          targetYield: 6,
          displayCurrency: "BRL",
        });
      });

      const aliceDb = testEnv.authenticatedContext(aliceUid).firestore();
      const aliceRef = doc(aliceDb, "users", aliceUid);

      // Attempting to update subscriptionStatus directly from client -> DENIED
      await assertFails(updateDoc(aliceRef, { subscriptionStatus: "pro" }));

      // Attempting to update stripeCustomerId directly from client -> DENIED
      await assertFails(updateDoc(aliceRef, { stripeCustomerId: "cus_hacker" }));
    });

    it("2. ALLOWS authenticated client updating legitimate fields (settings, investorProfile, issuerTickerMappings)", async () => {
      const aliceUid = "alice123";
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "users", aliceUid), {
          targetYield: 6,
        });
      });

      const aliceDb = testEnv.authenticatedContext(aliceUid).firestore();
      const aliceRef = doc(aliceDb, "users", aliceUid);

      await assertSucceeds(
        setDoc(
          aliceRef,
          {
            targetYield: 8,
            investorProfile: { riskProfile: "MODERATE" },
            issuerTickerMappings: { PETR4: "PETR3" },
          },
          { merge: true }
        )
      );
    });

    it("3. ALLOWS initial account creation without protected fields, but DENIES creation with subscriptionStatus or stripeCustomerId", async () => {
      const bobUid = "bob456";
      const bobDb = testEnv.authenticatedContext(bobUid).firestore();
      const bobRef = doc(bobDb, "users", bobUid);

      // Legitimate initial account creation -> ALLOWED
      await assertSucceeds(
        setDoc(bobRef, {
          targetYield: 6,
          displayCurrency: "BRL",
        })
      );

      const charlieUid = "charlie789";
      const charlieDb = testEnv.authenticatedContext(charlieUid).firestore();
      const charlieRef = doc(charlieDb, "users", charlieUid);

      // Initial creation containing subscriptionStatus -> DENIED
      await assertFails(
        setDoc(charlieRef, {
          targetYield: 6,
          subscriptionStatus: "pro",
        })
      );

      // Initial creation containing stripeCustomerId -> DENIED
      await assertFails(
        setDoc(charlieRef, {
          targetYield: 6,
          stripeCustomerId: "cus_fake",
        })
      );
    });

    it("4. ALLOWS Admin SDK context (rules disabled) to read and write subscriptionStatus and stripeCustomerId", async () => {
      const daveUid = "dave999";

      await assertSucceeds(
        testEnv.withSecurityRulesDisabled(async (context) => {
          const db = context.firestore();
          await setDoc(doc(db, "users", daveUid), {
            subscriptionStatus: "pro",
            stripeCustomerId: "cus_123456789",
          });
        })
      );
    });
  }
);
