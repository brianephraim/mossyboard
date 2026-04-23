import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "../db/client";
import { demoItem } from "../db/schema";

export async function createDemoItem(input: { bucket: string; order: number }) {
  const [row] = await db
    .insert(demoItem)
    .values({ bucket: input.bucket, order: input.order })
    .returning();
  if (!row) throw new Error("Failed to create demo item");
  return row;
}

export async function getDemoItem(input: { id: number }) {
  const row = await db.query.demoItem.findFirst({
    where: eq(demoItem.id, input.id),
  });
  return row ?? null;
}

/**
 * Demonstrates a reorder/move path:
 * - runs inside a DB transaction
 * - locks the moved row using SELECT ... FOR UPDATE via `.for("update")`
 * - checks last-known version and bumps it alongside the update
 */
export async function moveDemoItem(input: {
  id: number;
  expectedVersion: number;
  toBucket: string;
  toOrder: number;
}) {
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(demoItem)
      .where(eq(demoItem.id, input.id))
      .for("update");

    if (!locked) throw new TRPCError({ code: "NOT_FOUND", message: "Demo item not found" });

    if (locked.version !== input.expectedVersion) {
      throw new TRPCError({ code: "CONFLICT", message: "Version conflict" });
    }

    const [updated] = await tx
      .update(demoItem)
      .set({
        bucket: input.toBucket,
        order: input.toOrder,
        version: locked.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(demoItem.id, input.id), eq(demoItem.version, locked.version)))
      .returning();

    if (!updated) throw new TRPCError({ code: "CONFLICT", message: "Concurrent update" });
    return updated;
  });
}
