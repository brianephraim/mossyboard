import { z } from "zod";

import { publicProcedure, t } from "./init";

export const appRouter = t.router({
  health: publicProcedure.input(z.object({})).query(() => ({ ok: true })),
  echo: publicProcedure.input(z.object({ message: z.string().min(1) })).query(({ input }) => input),
});

export type AppRouter = typeof appRouter;
