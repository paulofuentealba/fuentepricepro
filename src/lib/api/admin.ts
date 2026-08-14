import { createServerFn } from "@tanstack/react-start";
import { getAdminAuth, getAdminFirestore } from "@/integrations/firebase/admin";
import {
  DEFAULT_FEATURE_GATES,
  KNOWN_FEATURE_GATE_KEYS,
  BOOLEAN_FEATURE_GATE_KEYS,
  type FeatureGatesConfig,
} from "@/lib/featureGates";
import { requireAdmin } from "@/lib/api/requireAdmin.server";

const INGESTION_LOOKBACK_MS = 48 * 60 * 60 * 1000;
const INGESTION_QUERY_LIMIT = 30;
const USERS_MAX_PAGE_SIZE = 50;
const USERS_DEFAULT_PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Feature Gates
// ---------------------------------------------------------------------------

export const getFeatureGatesFn = createServerFn({ method: "GET" })
  .validator((data: { idToken: string }) => ({ idToken: data?.idToken }))
  .handler(async ({ data }): Promise<FeatureGatesConfig> => {
    await requireAdmin(data.idToken);

    const adminDb = getAdminFirestore();
    if (!adminDb) throw new Error("500: Firestore administrativo indisponível");

    const snap = await adminDb.collection("config").doc("featureGates").get();
    if (!snap.exists) return { ...DEFAULT_FEATURE_GATES };
    return { ...DEFAULT_FEATURE_GATES, ...(snap.data() as FeatureGatesConfig) };
  });

/**
 * Validates that every key in the payload is a known FeatureGatesConfig key
 * and has the expected type. Throws on any unknown key or type mismatch —
 * this is a hard allow-list, not a best-effort sanitizer.
 */
export function validateFeatureGatesPayload(payload: Record<string, unknown>): Partial<FeatureGatesConfig> {
  const result: Partial<FeatureGatesConfig> = {};

  for (const key of Object.keys(payload)) {
    if (!(KNOWN_FEATURE_GATE_KEYS as string[]).includes(key)) {
      throw new Error(`400: campo desconhecido em featureGates: ${key}`);
    }

    const value = payload[key];
    if (key === "freeAssetLimit") {
      if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
        throw new Error("400: freeAssetLimit deve ser um número >= 0");
      }
      result.freeAssetLimit = value;
    } else if ((BOOLEAN_FEATURE_GATE_KEYS as string[]).includes(key)) {
      if (typeof value !== "boolean") {
        throw new Error(`400: ${key} deve ser um booleano`);
      }
      (result as Record<string, boolean>)[key] = value;
    }
  }

  return result;
}

export const updateFeatureGatesFn = createServerFn({ method: "POST" })
  .validator((data: { idToken: string; gates: Record<string, unknown> }) => ({
    idToken: data?.idToken,
    gates: data?.gates ?? {},
  }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await requireAdmin(data.idToken);

    const validated = validateFeatureGatesPayload(data.gates);

    const adminDb = getAdminFirestore();
    if (!adminDb) throw new Error("500: Firestore administrativo indisponível");

    await adminDb.collection("config").doc("featureGates").set(validated, { merge: true });
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Ingestion Log
// ---------------------------------------------------------------------------

export interface IngestionLogEntry {
  id: string;
  source: string;
  date: string;
  counts: Record<string, number>;
  updatedAtMs: number | null;
  lastError: {
    status: string;
    detail: string | null;
    ticker: string | null;
    timestampMs: number | null;
  } | null;
}

export const getIngestionLogFn = createServerFn({ method: "GET" })
  .validator((data: { idToken: string }) => ({ idToken: data?.idToken }))
  .handler(async ({ data }): Promise<IngestionLogEntry[]> => {
    await requireAdmin(data.idToken);

    const adminDb = getAdminFirestore();
    if (!adminDb) throw new Error("500: Firestore administrativo indisponível");

    const snap = await adminDb
      .collection("ingestionLog")
      .orderBy("updatedAt", "desc")
      .limit(INGESTION_QUERY_LIMIT)
      .get();

    const cutoff = Date.now() - INGESTION_LOOKBACK_MS;

    return snap.docs
      .map((doc) => {
        const d = doc.data();
        const updatedAtMs: number | null = d.updatedAt?.toMillis?.() ?? null;
        const lastError = d.lastError
          ? {
              status: d.lastError.status ?? null,
              detail: d.lastError.detail ?? null,
              ticker: d.lastError.ticker ?? null,
              timestampMs: d.lastError.timestamp?.toMillis?.() ?? null,
            }
          : null;

        return {
          id: doc.id,
          source: d.source ?? doc.id,
          date: d.date ?? "",
          counts: d.counts ?? {},
          updatedAtMs,
          lastError,
        } satisfies IngestionLogEntry;
      })
      .filter((entry) => entry.updatedAtMs === null || entry.updatedAtMs >= cutoff);
  });

// ---------------------------------------------------------------------------
// Users (read-only, minimized payload — see Prompt 88 §2.1)
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  displayName: string | null;
  email: string | null;
  subscriptionStatus: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  providerId: string | null;
}

export interface ListUsersResult {
  users: AdminUserRow[];
  nextPageToken: string | null;
}

/**
 * Minimization boundary: only these 6 fields ever leave `listUsersFn` (no
 * `uid`, per Prompt 88 §2.1 literal wording). Extracted as a pure function
 * so the exact output shape can be asserted in a unit test without needing
 * live Firebase Admin credentials — see `admin.server.test.ts`.
 * Do not add more fields without an explicit new prompt — see Prompt 88
 * "Proibido Nesta Rodada".
 */
export function mapAuthUserToAdminRow(
  authUser: { displayName?: string | null; email?: string | null; metadata: { creationTime?: string; lastSignInTime?: string }; providerData: Array<{ providerId?: string }> },
  subscriptionStatus: string | null,
): AdminUserRow {
  return {
    displayName: authUser.displayName ?? null,
    email: authUser.email ?? null,
    subscriptionStatus,
    createdAt: authUser.metadata.creationTime ?? null,
    lastLoginAt: authUser.metadata.lastSignInTime ?? null,
    providerId: authUser.providerData[0]?.providerId ?? null,
  };
}

export const listUsersFn = createServerFn({ method: "GET" })
  .validator((data: { idToken: string; pageToken?: string; pageSize?: number }) => ({
    idToken: data?.idToken,
    pageToken: data?.pageToken,
    pageSize: Math.min(Math.max(1, data?.pageSize ?? USERS_DEFAULT_PAGE_SIZE), USERS_MAX_PAGE_SIZE),
  }))
  .handler(async ({ data }): Promise<ListUsersResult> => {
    await requireAdmin(data.idToken);

    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();
    if (!adminAuth || !adminDb) throw new Error("500: administração indisponível");

    const page = await adminAuth.listUsers(data.pageSize, data.pageToken);

    const uids = page.users.map((u) => u.uid);
    const subscriptionByUid = new Map<string, string | null>();
    if (uids.length > 0) {
      const refs = uids.map((uid) => adminDb.collection("users").doc(uid));
      const docs = await adminDb.getAll(...refs);
      docs.forEach((docSnap) => {
        const status = docSnap.exists ? (docSnap.data()?.subscriptionStatus ?? null) : null;
        subscriptionByUid.set(docSnap.id, typeof status === "string" ? status : null);
      });
    }

    const users: AdminUserRow[] = page.users.map((u) =>
      mapAuthUserToAdminRow(u, subscriptionByUid.get(u.uid) ?? null),
    );

    return { users, nextPageToken: page.pageToken ?? null };
  });
