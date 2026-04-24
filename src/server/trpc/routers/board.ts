import { z } from "zod";

import {
  createBoardForUser,
  getBoardWithColumnsAndCardsForUser,
  listBoardsForUser,
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
  getWithColumnsAndCards: protectedProcedure.input(boardIdInput).query(({ ctx, input }) => {
    return getBoardWithColumnsAndCardsForUser(ctx.userId, input.boardId);
  }),
});
