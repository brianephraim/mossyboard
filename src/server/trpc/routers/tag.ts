import { z } from "zod";

import { addTagToCardForUser, detachTagFromCardForUser, listTagsForUser } from "../../tag/service";
import { protectedProcedure, t } from "../init";

export const tagRouter = t.router({
  list: protectedProcedure.input(z.object({})).query(({ ctx }) => listTagsForUser(ctx.userId)),
  addToCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        name: z
          .string()
          .trim()
          .min(1, "Tag name cannot be empty")
          .max(40, "Tag name cannot exceed 40 characters")
          .refine((v) => !v.includes(","), "Tag name cannot contain a comma"),
      }),
    )
    .mutation(({ ctx, input }) => addTagToCardForUser(ctx.userId, input)),
  detachFromCard: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        tagId: z.string().uuid(),
      }),
    )
    .mutation(({ ctx, input }) => detachTagFromCardForUser(ctx.userId, input)),
});
