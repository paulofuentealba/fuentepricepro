export interface AccountDeletionInput {
  userId: string;
  assetIds?: string[];
  transactionIds?: string[];
  portfolioSnapshotIds?: string[];
  feedbackIds?: string[];
}

/**
 * Builds the ordered list of relative Firestore document paths to be deleted during account scrubbing.
 *
 * ORDER IS CRITICAL (LGPD Compliance & Data Integrity):
 * Subcollection documents (assets, transactions, portfolioSnapshots, feedbacks) MUST be listed BEFORE
 * the root user document `users/{userId}`. If the root document were deleted first and an error
 * occurred during subcollection deletion, the subcollection documents would become orphaned and inaccessible.
 */
export function buildAccountDeletionPaths(input: AccountDeletionInput): string[] {
  const {
    userId,
    assetIds = [],
    transactionIds = [],
    portfolioSnapshotIds = [],
    feedbackIds = [],
  } = input;

  if (!userId) {
    throw new Error("userId é obrigatório para construir os caminhos de exclusão de conta.");
  }

  const assetPaths = (assetIds || []).map((id) => `users/${userId}/assets/${id}`);
  const txPaths = (transactionIds || []).map((id) => `users/${userId}/transactions/${id}`);
  const snapshotPaths = (portfolioSnapshotIds || []).map(
    (id) => `users/${userId}/portfolioSnapshots/${id}`
  );
  const feedbackPaths = (feedbackIds || []).map((id) => `users/${userId}/feedbacks/${id}`);
  const rootUserPath = `users/${userId}`;

  return [
    ...assetPaths,
    ...txPaths,
    ...snapshotPaths,
    ...feedbackPaths,
    rootUserPath,
  ];
}
