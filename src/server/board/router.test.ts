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
  it("validates trimmed board names for create and rename", async () => {
    const { adminAuth } = await import("../auth/admin");
    const verifyIdTokenMock = vi.mocked(adminAuth.verifyIdToken);
    verifyIdTokenMock.mockResolvedValue({ uid: "u_123" } as Awaited<
      ReturnType<typeof adminAuth.verifyIdToken>
    >);

    const { appRouter } = await import("../trpc/router");
    const caller = appRouter.createCaller({
      requestId: "r",
      authHeader: "Bearer good",
      userId: null,
      userEmail: null,
    });

    await assert.rejects(
      () => caller.board.create({ name: "   " }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );
    await assert.rejects(
      () =>
        caller.board.rename({
          boardId: "00000000-0000-4000-8000-000000000001",
          name: "   ",
        }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );
  });

  it("validates board ids as UUIDs", async () => {
    const { adminAuth } = await import("../auth/admin");
    const verifyIdTokenMock = vi.mocked(adminAuth.verifyIdToken);
    verifyIdTokenMock.mockResolvedValue({ uid: "u_123" } as Awaited<
      ReturnType<typeof adminAuth.verifyIdToken>
    >);

    const { appRouter } = await import("../trpc/router");
    const caller = appRouter.createCaller({
      requestId: "r",
      authHeader: "Bearer good",
      userId: null,
      userEmail: null,
    });

    await assert.rejects(
      () => caller.board.softDelete({ boardId: "not-a-uuid" }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );
    await assert.rejects(
      () => caller.board.getStructure({ boardId: "not-a-uuid" }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );
  });
});
