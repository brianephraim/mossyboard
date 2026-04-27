import { z } from "zod";

import {
  addSampleDataToBoardForUser,
  createBoardForUser,
  getBoardStructureForUser,
  listBoardsForUser,
  renameBoardForUser,
  softDeleteBoardForUser,
} from "../../board/service";
import { protectedProcedure, t } from "../init";

const createBoardInput = z.object({
  name: z.string().trim().min(1).max(80),
});

const boardIdInput = z.object({
  boardId: z.string().uuid(),
});

export const boardRouter = t.router({
  list: protectedProcedure.input(z.object({})).query(({ ctx }) => {
    return listBoardsForUser(ctx.userId);
  }),
  create: protectedProcedure.input(createBoardInput).mutation(({ ctx, input }) => {
    return createBoardForUser(ctx.userId, input);
  }),
  getStructure: protectedProcedure.input(boardIdInput).query(({ ctx, input }) => {
    return getBoardStructureForUser(ctx.userId, input);
  }),
  rename: protectedProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
      }),
    )
    .mutation(({ ctx, input }) => {
      return renameBoardForUser(ctx.userId, input);
    }),
  softDelete: protectedProcedure.input(boardIdInput).mutation(({ ctx, input }) => {
    return softDeleteBoardForUser(ctx.userId, input);
  }),
  addSampleData: protectedProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        count: z.number().int().min(1).max(2000),
      }),
    )
    .mutation(({ ctx, input }) => {
      return addSampleDataToBoardForUser(ctx.userId, input);
    }),
});
