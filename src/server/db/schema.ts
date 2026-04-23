import { bigint, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const sharedCounter = pgTable(
  "shared_counter",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().default("singleton"),
    value: bigint("value", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    singleton: uniqueIndex("shared_counter_singleton").on(t.key),
  }),
);
