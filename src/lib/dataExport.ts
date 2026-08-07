export interface UserDataExportInput {
  userDoc?: Record<string, any> | null;
  localIssuerTickerMappings?: Record<string, string> | null;
  assets?: Record<string, any>[];
  transactions?: Record<string, any>[];
  portfolioSnapshots?: Record<string, any>[];
  metadata: {
    userId: string;
    email?: string | null;
    exportedAt: string;
    appVersion?: string;
  };
}

export interface UserDataExportPayload {
  version: string;
  exportedAt: string;
  user: {
    uid: string;
    email: string | null;
    profileAndSettings: Record<string, any>;
    issuerTickerMappings: Record<string, string>;
  };
  data: {
    assets: Record<string, any>[];
    transactions: Record<string, any>[];
    portfolioSnapshots: Record<string, any>[];
  };
}

/**
 * Pure function that cleans, normalizes, and serializes user data for export.
 * Excludes public market data like enrichedFundamentals.
 * Merges local and cloud issuerTickerMappings (cloud takes precedence in conflict).
 */
export function buildUserDataExport(input: UserDataExportInput): UserDataExportPayload {
  const {
    userDoc = {},
    localIssuerTickerMappings = {},
    assets = [],
    transactions = [],
    portfolioSnapshots = [],
    metadata,
  } = input;

  // Extract cloud issuerTickerMappings and profile fields
  const {
    issuerTickerMappings: cloudMappings = {},
    enrichedFundamentals: _userEf,
    ...profileAndSettings
  } = userDoc || {};

  // Merge local & cloud mappings (cloud takes precedence in conflict)
  const mergedMappings: Record<string, string> = {
    ...(localIssuerTickerMappings || {}),
    ...(cloudMappings || {}),
  };

  // Clean assets (strip enrichedFundamentals if present)
  const cleanAssets = (assets || []).map((asset) => {
    const { enrichedFundamentals, ...cleanAsset } = asset || {};
    return cleanAsset;
  });

  // Clean transactions
  const cleanTransactions = (transactions || []).map((tx) => {
    const { ...cleanTx } = tx || {};
    return cleanTx;
  });

  // Clean snapshots
  const cleanSnapshots = (portfolioSnapshots || []).map((snap) => {
    const { ...cleanSnap } = snap || {};
    return cleanSnap;
  });

  return {
    version: "1.0",
    exportedAt: metadata.exportedAt,
    user: {
      uid: metadata.userId,
      email: metadata.email ?? null,
      profileAndSettings,
      issuerTickerMappings: mergedMappings,
    },
    data: {
      assets: cleanAssets,
      transactions: cleanTransactions,
      portfolioSnapshots: cleanSnapshots,
    },
  };
}
