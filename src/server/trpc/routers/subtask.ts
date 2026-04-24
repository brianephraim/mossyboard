import { z } from "zod";

import {
  createSubtaskForUser,
  softDeleteSubtaskForUser,
  toggleSubtaskForUser,
  updateSubtaskForUser,
} from "../../subtask/service";
import { protectedProcedure, t } from "../init";

const subtaskIdSchema = z.string().uuid();

export const subtaskRouter = t.router({
  create: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
      }),
    )
    .mutation(({ ctx, input }) => {
      return createSubtaskForUser(ctx.userId, input);
    }),
  update: protectedProcedure
    .input(
      z.object({
        subtaskId: subtaskIdSchema,
        title: z.string().trim().min(1).max(200),
        expectedVersion: z.number().int().min(0),
      }),
    )
    .mutation(({ ctx, input }) => {
      return updateSubtaskForUser(ctx.userId, input);
    }),
  toggle: protectedProcedure
    .input(
      z.object({
        subtaskId: subtaskIdSchema,
        isDone: z.boolean(),
        expectedVersion: z.number().int().min(0),
      }),
    )
    .mutation(({ ctx, input }) => {
      return toggleSubtaskForUser(ctx.userId, input);
    }),
  softDelete: protectedProcedure
    .input(
      z.object({
        subtaskId: subtaskIdSchema,
        expectedVersion: z.number().int().min(0),
      }),
    )
    .mutation(({ ctx, input }) => {
      return softDeleteSubtaskForUser(ctx.userId, input);
    }),
});
