import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../integrations/firebase/admin";
import { sanitizeLogMessage } from "./http.server";

export type IngestionStatus = "PASSED" | "FAILED" | "ERROR" | "SKIPPED" | "INVALID" | "WARNING";

export type IngestionSource = "brapi" | "yahoo" | "cvm" | "secEdgar" | "nasdaq" | "benchmark" | "hgBrasil" | "dadosdemercado";

const MAX_DETAIL_LENGTH = 500;

/**
 * Fire-and-forget write to ingestionLog/{source}_{date}. Never throws and
 * never delays the caller — a failure here must not affect the main
 * request. Aggregated by source+day (not per-call) to keep Firestore
 * write volume bounded despite high-frequency sources like Brapi/Yahoo.
 */
export function reportIngestionStatus(
  source: IngestionSource,
  status: IngestionStatus,
  detail?: string,
  ticker?: string,
): void {
  const cleanDetail = detail ? sanitizeLogMessage(detail) : undefined;
  void writeIngestionStatus(source, status, cleanDetail, ticker).catch((error) => {
    console.warn(
      `[ingestionLog] failed to report ${source}/${status}:`,
      error instanceof Error ? sanitizeLogMessage(error.message) : error,
    );
  });
}

async function writeIngestionStatus(
  source: IngestionSource,
  status: IngestionStatus,
  detail?: string,
  ticker?: string,
): Promise<void> {
  const adminDb = getAdminFirestore();
  if (!adminDb) return;

  const date = new Date().toISOString().slice(0, 10);
  const docId = `${source}_${date}`;
  const counterKey = status.toLowerCase();

  const update: Record<string, unknown> = {
    source,
    date,
    [`counts.${counterKey}`]: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (status !== "PASSED") {
    update.lastError = {
      status,
      detail: detail ? sanitizeLogMessage(detail).slice(0, MAX_DETAIL_LENGTH) : null,
      ticker: ticker ?? null,
      timestamp: FieldValue.serverTimestamp(),
    };
  }

  await adminDb.collection("ingestionLog").doc(docId).set(update, { merge: true });
}
