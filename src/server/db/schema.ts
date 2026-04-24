import { relations } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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

export const cardPriorityValues = ["none", "low", "medium", "high"] as const;

export type CardPriority = (typeof cardPriorityValues)[number];

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    ownerUpdatedAtIdx: index("boards_owner_updated_at_idx").on(t.ownerId, t.updatedAt),
  }),
);

export const columns = pgTable(
  "columns",
  {
    id: uuid("id").primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id),
    title: text("title").notNull(),
    position: text("position").notNull(),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    boardPositionIdx: index("columns_board_position_idx").on(t.boardId, t.position),
  }),
);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey(),
    columnId: uuid("column_id")
      .notNull()
      .references(() => columns.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    priority: text("priority").notNull().default("none"),
    position: text("position").notNull(),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    columnPositionIdx: index("cards_column_position_idx").on(t.columnId, t.position),
  }),
);

export const cardSubtasks = pgTable(
  "card_subtasks",
  {
    id: uuid("id").primaryKey(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    title: text("title").notNull(),
    isDone: boolean("is_done").notNull().default(false),
    position: text("position").notNull(),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    cardPositionIdx: index("card_subtasks_card_position_idx").on(t.cardId, t.position),
  }),
);

export const boardsRelations = relations(boards, ({ many }) => ({
  columns: many(columns),
}));

export const columnsRelations = relations(columns, ({ one, many }) => ({
  board: one(boards, {
    fields: [columns.boardId],
    references: [boards.id],
  }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  subtasks: many(cardSubtasks),
  column: one(columns, {
    fields: [cards.columnId],
    references: [columns.id],
  }),
}));

export const cardSubtasksRelations = relations(cardSubtasks, ({ one }) => ({
  card: one(cards, {
    fields: [cardSubtasks.cardId],
    references: [cards.id],
  }),
}));
