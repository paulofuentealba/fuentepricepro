import { getAdminFirestore } from "../../integrations/firebase/admin";
import { reportIngestionStatus } from "./ingestionLog.server";
import cvmLocalCache from "./data/cvm_enriched.json";

export interface CvmEnrichedData {
  vpa: number | null;
  lpa: number | null;
  vacancy: number | null;
  updatedAt?: string;
}

export async function fetchCvmEnrichedFacts(ticker: string): Promise<CvmEnrichedData> {
  const cleanKey = ticker.toUpperCase().replace(/\.SA$/, "").trim();

  // 1. Try reading from Firestore via Admin SDK (server-to-server)
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const docSnap = await adminDb.collection("enrichedFundamentals").doc(cleanKey).get();
      if (docSnap.exists) {
        const data = docSnap.data() as CvmEnrichedData;
        reportIngestionStatus("cvm", "PASSED", undefined, cleanKey);
        return {
          vpa: typeof data.vpa === "number" ? data.vpa : null,
          lpa: typeof data.lpa === "number" ? data.lpa : null,
          vacancy: typeof data.vacancy === "number" ? data.vacancy : null,
          updatedAt: data.updatedAt,
        };
      }
    }
  } catch (error) {
    console.warn(`[CVM Server] Firestore read failed for ${cleanKey}, falling back to local JSON cache:`, error);
    reportIngestionStatus(
      "cvm",
      "ERROR",
      error instanceof Error ? error.message : String(error),
      cleanKey,
    );
  }

  // 2. Fallback to local JSON cache
  const localData = (cvmLocalCache as Record<string, CvmEnrichedData>)[cleanKey];
  if (localData) {
    reportIngestionStatus("cvm", "WARNING", "fallback to local cache", cleanKey);
    return {
      vpa: typeof localData.vpa === "number" ? localData.vpa : null,
      lpa: typeof localData.lpa === "number" ? localData.lpa : null,
      vacancy: typeof localData.vacancy === "number" ? localData.vacancy : null,
      updatedAt: localData.updatedAt,
    };
  }

  reportIngestionStatus("cvm", "INVALID", "no data in Firestore or local cache", cleanKey);
  return { vpa: null, lpa: null, vacancy: null };
}
