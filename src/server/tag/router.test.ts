import assert from "node:assert/strict";

import { describe, it, vi } from "vitest";

vi.mock("../auth/admin", () => {
  return {
    adminAuth: {
      verifyIdToken: vi.fn(),
    },
  };
});

describe("tag router", () => {
  it("rejects empty, over-long, and comma-bearing tag names", async () => {
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

    const cardId = "00000000-0000-4000-8000-000000000001";

    await assert.rejects(
      () => caller.tag.addToCard({ cardId, name: "" }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );

    await assert.rejects(
      () => caller.tag.addToCard({ cardId, name: "x".repeat(41) }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );

    await assert.rejects(
      () => caller.tag.addToCard({ cardId, name: "foo,bar" }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );
  });

  it("validates UUIDs on cardId and tagId", async () => {
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
      () => caller.tag.addToCard({ cardId: "not-a-uuid", name: "Bug" }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );

    await assert.rejects(
      () =>
        caller.tag.detachFromCard({
          cardId: "00000000-0000-4000-8000-000000000001",
          tagId: "not-a-uuid",
        }),
      (err: unknown) => (err as { code?: string })?.code === "BAD_REQUEST",
    );
  });

  it("rejects unauthenticated calls to tag.list", async () => {
    const { appRouter } = await import("../trpc/router");
    const caller = appRouter.createCaller({
      requestId: "r",
      authHeader: null,
      userId: null,
      userEmail: null,
    });

    await assert.rejects(
      () => caller.tag.list({}),
      (err: unknown) => (err as { code?: string })?.code === "UNAUTHORIZED",
    );
  });
});
