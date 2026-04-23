import { z } from "zod";

import { publicProcedure, t } from "./init";
import { incrementCounter, readCounter } from "../counter/service";

export const appRouter = t.router({
  health: publicProcedure.input(z.object({})).query(() => ({ ok: true })),
  echo: publicProcedure.input(z.object({ message: z.string().min(1) })).query(({ input }) => input),
  counter: t.router({
    get: publicProcedure.input(z.object({})).query(() => readCounter()),
    increment: publicProcedure.input(z.object({})).mutation(() => incrementCounter()),
  }),
});

export type AppRouter = typeof appRouter;
