import { describe, it, expect } from "vitest";
import { buildAccountDeletionPaths } from "../accountDeletion";

describe("buildAccountDeletionPaths", () => {
  it("should build ordered deletion paths for all 4 subcollections and root user document last", () => {
    const input = {
      userId: "user-123",
      assetIds: ["asset-1", "asset-2"],
      transactionIds: ["tx-1"],
      portfolioSnapshotIds: ["2026-08-01", "2026-08-02"],
      feedbackIds: ["fb-1", "fb-2"],
    };

    const paths = buildAccountDeletionPaths(input);

    expect(paths).toEqual([
      "users/user-123/assets/asset-1",
      "users/user-123/assets/asset-2",
      "users/user-123/transactions/tx-1",
      "users/user-123/portfolioSnapshots/2026-08-01",
      "users/user-123/portfolioSnapshots/2026-08-02",
      "users/user-123/feedbacks/fb-1",
      "users/user-123/feedbacks/fb-2",
      "users/user-123",
    ]);

    // Critical assertion: root doc MUST be the last element
    expect(paths[paths.length - 1]).toBe("users/user-123");
  });

  it("should handle empty subcollections and still place root document last", () => {
    const input = {
      userId: "user-empty",
      assetIds: [],
      transactionIds: [],
      portfolioSnapshotIds: [],
    };

    const paths = buildAccountDeletionPaths(input);

    expect(paths).toEqual(["users/user-empty"]);
  });

  it("should throw an error if userId is empty or missing", () => {
    expect(() =>
      buildAccountDeletionPaths({
        userId: "",
        assetIds: [],
      })
    ).toThrow("userId é obrigatório");
  });
});
