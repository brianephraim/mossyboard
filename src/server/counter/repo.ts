import { desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "../db/client";
import { sharedCounter, sharedCounterEvent } from "../db/schema";

const SINGLETON_KEY = "singleton" as const;

export async function getSharedCounter() {
  const row = await ensureRow();
  return { value: row.value };
}

export async function incrementSharedCounter() {
  await ensureRow();

  await db.insert(sharedCounterEvent).values({ counterKey: SINGLETON_KEY, delta: 1 });

  const [updated] = await db
    .update(sharedCounter)
    .set({
      value: sql`${sharedCounter.value} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(sharedCounter.key, SINGLETON_KEY))
    .returning({ value: sharedCounter.value });

  if (!updated) throw new Error("Failed to increment shared counter");
  return { value: updated.value };
}

export async function getSharedCounterWithRecentEvents(limit = 10) {
  const row = await ensureRow();

  const withChildren = await db.query.sharedCounter.findFirst({
    where: eq(sharedCounter.key, SINGLETON_KEY),
    with: {
      events: {
        where: eq(sharedCounterEvent.counterKey, SINGLETON_KEY),
        orderBy: [desc(sharedCounterEvent.createdAt)],
        limit,
      },
    },
  });

  if (!withChildren) throw new Error("Missing shared counter row");

  return {
    value: withChildren.value,
    events: withChildren.events.map((e) => ({
      delta: e.delta,
      createdAt: e.createdAt,
    })),
  };
}

async function ensureRow() {
  const existing = await db.query.sharedCounter.findFirst({
    where: eq(sharedCounter.key, SINGLETON_KEY),
  });
  if (existing) return existing;

  const [inserted] = await db
    .insert(sharedCounter)
    .values({ key: SINGLETON_KEY, value: 0 })
    .onConflictDoNothing()
    .returning();

  if (inserted) return inserted;

  const after = await db.query.sharedCounter.findFirst({
    where: eq(sharedCounter.key, SINGLETON_KEY),
  });
  if (!after) throw new Error("Failed to initialize shared counter row");
  return after;
}
