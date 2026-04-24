import assert from "node:assert/strict";

import { describe, it, vi } from "vitest";

vi.mock("../auth/admin", () => {
  return {
    adminAuth: {
      verifyIdToken: vi.fn(),
    },
  };
});

describe("board router", () => {
  it("validates trimmed board names", async () => {
    const { adminAuth } = await import("../auth/admin");
    (adminAuth.verifyIdToken as any).mockResolvedValueOnce({ uid: "u_123" });

    const { appRouter } = await import("../trpc/router");
    const caller = appRouter.createCaller({
      requestId: "r",
      authHeader: "Bearer good",
      userId: null,
      userEmail: null,
    });

    await assert.rejects(
      () => caller.board.create({ name: "   " }),
      (err: any) => err?.code === "BAD_REQUEST",
    );
  });

  it("validates board ids as UUIDs", async () => {
    const { adminAuth } = await import("../auth/admin");
    (adminAuth.verifyIdToken as any).mockResolvedValueOnce({ uid: "u_123" });

    const { appRouter } = await import("../trpc/router");
    const caller = appRouter.createCaller({
      requestId: "r",
      authHeader: "Bearer good",
      userId: null,
      userEmail: null,
    });

    await assert.rejects(
      () => caller.board.getWithColumnsAndCards({ boardId: "not-a-uuid" }),
      (err: any) => err?.code === "BAD_REQUEST",
    );
  });
});
