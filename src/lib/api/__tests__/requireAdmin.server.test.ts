import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyIdToken = vi.fn();

vi.mock("@/integrations/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
}));

import { requireAdmin } from "../requireAdmin.server";

describe("requireAdmin", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("throws 401 when no token is provided", async () => {
    await expect(requireAdmin(null)).rejects.toThrow(/^401:/);
    await expect(requireAdmin(undefined)).rejects.toThrow(/^401:/);
    await expect(requireAdmin("")).rejects.toThrow(/^401:/);
  });

  it("throws 403 when the token is valid but lacks the isAdmin claim", async () => {
    verifyIdToken.mockResolvedValue({ uid: "user-1", isAdmin: false });
    await expect(requireAdmin("valid-token")).rejects.toThrow(/^403:/);
  });

  it("throws 401 when token verification fails", async () => {
    verifyIdToken.mockRejectedValue(new Error("invalid signature"));
    await expect(requireAdmin("bad-token")).rejects.toThrow(/^401:/);
  });

  it("resolves with uid and isAdmin=true for a valid admin token", async () => {
    verifyIdToken.mockResolvedValue({ uid: "admin-1", isAdmin: true });
    await expect(requireAdmin("good-token")).resolves.toEqual({ uid: "admin-1", isAdmin: true });
  });
});
