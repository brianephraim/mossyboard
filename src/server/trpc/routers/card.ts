import { z } from "zod";

import { cardPriorityValues } from "../../db/schema";
import {
  createCardForUser,
  getCardForUser,
  listCardsByBoardForUser,
  moveCardForUser,
  reorderCardForUser,
  softDeleteCardForUser,
  updateCardForUser,
} from "../../card/service";
import { protectedProcedure, t } from "../init";

const cardPrioritySchema = z.enum(cardPriorityValues);
const cardIdSchema = z.string().uuid();
const columnIdSchema = z.string().uuid();

export const cardRouter = t.router({
  get: protectedProcedure
    .input(
      z.object({
        cardId: cardIdSchema,
        boardId: z.string().uuid().optional(),
      }),
    )
    .query(({ ctx, input }) => {
      return getCardForUser(ctx.userId, input);
    }),
  create: protectedProcedure
    .input(
      z.object({
        columnId: columnIdSchema,
        title: z.string().trim().min(1).max(200),
        description: z.string().max(10000).optional(),
        priority: cardPrioritySchema.optional(),
        prevCardId: cardIdSchema.nullish(),
        nextCardId: cardIdSchema.nullish(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return createCardForUser(ctx.userId, input);
    }),
  update: protectedProcedure
    .input(
      z.object({
        cardId: cardIdSchema,
        title: z.string().trim().min(1).max(200),
        description: z.string().max(10000),
        priority: cardPrioritySchema,
        expectedVersion: z.number().int().min(0),
      }),
    )
    .mutation(({ ctx, input }) => {
      return updateCardForUser(ctx.userId, input);
    }),
  softDelete: protectedProcedure
    .input(
      z.object({
        cardId: cardIdSchema,
        expectedVersion: z.number().int().min(0),
      }),
    )
    .mutation(({ ctx, input }) => {
      return softDeleteCardForUser(ctx.userId, input);
    }),
  move: protectedProcedure
    .input(
      z.object({
        cardId: cardIdSchema,
        targetColumnId: columnIdSchema,
        priority: cardPrioritySchema.optional(),
        prevCardId: cardIdSchema.nullish(),
        nextCardId: cardIdSchema.nullish(),
        expectedVersion: z.number().int().min(0),
      }),
    )
    .mutation(({ ctx, input }) => {
      return moveCardForUser(ctx.userId, input);
    }),
  reorder: protectedProcedure
    .input(
      z.object({
        cardId: cardIdSchema,
        columnId: columnIdSchema,
        priority: cardPrioritySchema.optional(),
        prevCardId: cardIdSchema.nullish(),
        nextCardId: cardIdSchema.nullish(),
        expectedVersion: z.number().int().min(0),
      }),
    )
    .mutation(({ ctx, input }) => {
      return reorderCardForUser(ctx.userId, input);
    }),
  listByBoard: protectedProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        filters: z
          .object({
            priority: z.array(cardPrioritySchema).min(1).optional(),
          })
          .optional(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z
          .object({
            updatedAt: z.string().datetime({ offset: true }),
            cardId: cardIdSchema,
          })
          .nullable()
          .optional(),
      }),
    )
    .query(({ ctx, input }) => {
      return listCardsByBoardForUser(ctx.userId, input);
    }),
});
