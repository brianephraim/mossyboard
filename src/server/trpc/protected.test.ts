import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

vi.mock("../auth/admin", () => {
  return {
    adminAuth: {
      verifyIdToken: vi.fn(),
    },
  };
});

describe("protectedProcedure", () => {
  it("rejects missing token", async () => {
    const { appRouter } = await import("./router");
    const caller = appRouter.createCaller({ requestId: "r", authHeader: null, userId: null });

    await assert.rejects(
      () => caller.protectedEcho({ message: "hi" }),
      (err: any) => {
        return err?.code === "UNAUTHORIZED";
      },
    );
  });

  it("rejects invalid token", async () => {
    const { adminAuth } = await import("../auth/admin");
    (adminAuth.verifyIdToken as any).mockRejectedValueOnce(new Error("bad"));

    const { appRouter } = await import("./router");
    const caller = appRouter.createCaller({
      requestId: "r",
      authHeader: "Bearer bad",
      userId: null,
    });

    await assert.rejects(
      () => caller.protectedEcho({ message: "hi" }),
      (err: any) => {
        return err?.code === "UNAUTHORIZED";
      },
    );
  });

  it("accepts valid token and sets ctx.userId", async () => {
    const { adminAuth } = await import("../auth/admin");
    (adminAuth.verifyIdToken as any).mockResolvedValueOnce({ uid: "u_123" });

    const { appRouter } = await import("./router");
    const caller = appRouter.createCaller({
      requestId: "r",
      authHeader: "Bearer good",
      userId: null,
    });

    const result = await caller.protectedEcho({ message: "hi" });
    assert.equal(result.userId, "u_123");
  });
});
