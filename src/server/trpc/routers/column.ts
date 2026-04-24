import { z } from "zod";

import {
  createColumnForUser,
  renameColumnForUser,
  reorderColumnForUser,
} from "../../column/service";
import { protectedProcedure, t } from "../init";

const columnIdSchema = z.string().uuid();

export const columnRouter = t.router({
  create: protectedProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        title: z.string().trim().min(1).max(80),
        prevColumnId: columnIdSchema.nullish(),
        nextColumnId: columnIdSchema.nullish(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return createColumnForUser(ctx.userId, input);
    }),
  rename: protectedProcedure
    .input(
      z.object({
        columnId: columnIdSchema,
        title: z.string().trim().min(1).max(80),
        expectedVersion: z.number().int().min(0),
      }),
    )
    .mutation(({ ctx, input }) => {
      return renameColumnForUser(ctx.userId, input);
    }),
  reorder: protectedProcedure
    .input(
      z.object({
        columnId: columnIdSchema,
        prevColumnId: columnIdSchema.nullish(),
        nextColumnId: columnIdSchema.nullish(),
        expectedVersion: z.number().int().min(0),
      }),
    )
    .mutation(({ ctx, input }) => {
      return reorderColumnForUser(ctx.userId, input);
    }),
});
