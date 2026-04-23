import { z } from "zod";

import { publicProcedure, t } from "./init";
import { getSharedCounter, incrementSharedCounter } from "../counter/repo";

export const appRouter = t.router({
  health: publicProcedure.input(z.object({})).query(() => ({ ok: true })),
  echo: publicProcedure.input(z.object({ message: z.string().min(1) })).query(({ input }) => input),
  counter: t.router({
    get: publicProcedure.input(z.object({})).query(() => getSharedCounter()),
    increment: publicProcedure.input(z.object({})).mutation(() => incrementSharedCounter()),
  }),
});

export type AppRouter = typeof appRouter;
