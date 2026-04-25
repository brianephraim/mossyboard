import assert from "node:assert/strict";

import { describe, it, vi } from "vitest";

vi.mock("../auth/admin", () => {
  return {
    adminAuth: {
      verifyIdToken: vi.fn(),
    },
  };
});

describe("card router", () => {
  it("validates create/update payloads and priority enum values", async () => {
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
        caller.card.create({
          columnId: "00000000-0000-4000-8000-000000000001",
          title: "   ",
        }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );

    await assert.rejects(
      () =>
        caller.card.update({
          cardId: "00000000-0000-4000-8000-000000000002",
          title: "Card",
          description: "",
          priority: "urgent" as never,
          expectedVersion: 0,
        }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );

    await assert.rejects(
      () =>
        caller.card.move({
          cardId: "00000000-0000-4000-8000-000000000005",
          targetColumnId: "00000000-0000-4000-8000-000000000006",
          priority: "urgent" as never,
          expectedVersion: 0,
        }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );
  });

  it("validates cursor timestamps and UUID ids", async () => {
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
        caller.card.get({
          cardId: "not-a-uuid",
        }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );

    await assert.rejects(
      () =>
        caller.card.listByBoard({
          boardId: "00000000-0000-4000-8000-000000000003",
          cursor: {
            updatedAt: "yesterday",
            cardId: "00000000-0000-4000-8000-000000000004",
          },
          limit: 50,
        }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );
  });
});
