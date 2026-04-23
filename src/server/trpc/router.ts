import { z } from "zod";

import { protectedProcedure, publicProcedure, t } from "./init";
import { incrementCounter, readCounter } from "../counter/service";
import { sendPasswordResetEmail, sendVerificationEmail } from "../auth/email-service";
import { TRPCError } from "@trpc/server";

export const appRouter = t.router({
  health: publicProcedure.input(z.object({})).query(() => ({ ok: true })),
  echo: publicProcedure.input(z.object({ message: z.string().min(1) })).query(({ input }) => input),
  counter: t.router({
    get: publicProcedure.input(z.object({})).query(() => readCounter()),
    increment: publicProcedure.input(z.object({})).mutation(() => incrementCounter()),
  }),
  protectedEcho: protectedProcedure
    .input(z.object({ message: z.string().min(1) }))
    .query(({ input, ctx }) => ({ message: input.message, userId: ctx.userId })),
  authEmail: t.router({
    sendVerification: protectedProcedure.input(z.object({})).mutation(async ({ ctx }) => {
      if (!ctx.userEmail) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Missing email on auth token" });
      }
      return sendVerificationEmail(ctx.userEmail);
    }),
    sendPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => sendPasswordResetEmail(input.email)),
  }),
});

export type AppRouter = typeof appRouter;
