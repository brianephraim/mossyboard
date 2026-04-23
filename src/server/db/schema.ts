import { relations } from "drizzle-orm";
import {
  bigint,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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

export const sharedCounterEvent = pgTable("shared_counter_event", {
  id: serial("id").primaryKey(),
  counterKey: text("counter_key").notNull(),
  delta: integer("delta").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sharedCounterRelations = relations(sharedCounter, ({ many }) => ({
  events: many(sharedCounterEvent),
}));

export const sharedCounterEventRelations = relations(sharedCounterEvent, ({ one }) => ({
  counter: one(sharedCounter, {
    fields: [sharedCounterEvent.counterKey],
    references: [sharedCounter.key],
  }),
}));

export const demoItem = pgTable(
  "demo_item",
  {
    id: serial("id").primaryKey(),
    bucket: text("bucket").notNull(),
    order: integer("order").notNull(),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueInBucket: uniqueIndex("demo_item_bucket_order_unique").on(t.bucket, t.order),
  }),
);
