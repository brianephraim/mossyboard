import assert from "node:assert/strict";

import { describe, it, vi } from "vitest";

vi.mock("../auth/admin", () => {
  return {
    adminAuth: {
      verifyIdToken: vi.fn(),
    },
  };
});

describe("subtask router", () => {
  it("validates trimmed titles and UUID ids", async () => {
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
      () =>
        caller.subtask.create({
          cardId: "00000000-0000-4000-8000-000000000001",
          title: "   ",
        }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );

    await assert.rejects(
      () =>
        caller.subtask.toggle({
          subtaskId: "not-a-uuid",
          isDone: true,
          expectedVersion: 0,
        }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );
  });
});
