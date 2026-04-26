import { z } from "zod";

import { protectedProcedure, publicProcedure, t } from "./init";
import { incrementCounter, readCounter } from "../counter/service";
import { sendPasswordResetEmail, sendVerificationEmail } from "../auth/email-service";
import { TRPCError } from "@trpc/server";
import { adminAuth } from "../auth/admin";
import { logger } from "../logging/logger";
import { boardRouter } from "./routers/board";
import { cardRouter } from "./routers/card";
import { columnRouter } from "./routers/column";

export const appRouter = t.router({
  health: publicProcedure.input(z.object({})).query(() => ({ ok: true })),
  echo: publicProcedure.input(z.object({ message: z.string().min(1) })).query(({ input }) => input),
  board: boardRouter,
  card: cardRouter,
  column: columnRouter,
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
      logger.debug(
        {
          requestId: ctx.requestId,
          to: {
            hasPlus: ctx.userEmail.includes("+"),
            domain: ctx.userEmail.split("@")[1] ?? null,
          },
        },
        "authEmail.sendVerification.request",
      );
      return sendVerificationEmail(ctx.userEmail);
    }),
    sendPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        logger.debug(
          {
            requestId: ctx.requestId,
            to: {
              hasPlus: input.email.includes("+"),
              domain: input.email.split("@")[1] ?? null,
            },
          },
          "authEmail.sendPasswordReset.request",
        );
        return sendPasswordResetEmail(input.email);
      }),
    devSendPasswordResetTo: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        if (process.env.NODE_ENV === "production") {
          throw new TRPCError({ code: "FORBIDDEN", message: "dev-only procedure" });
        }

        let createdUserUid: string | null = null;
        try {
          const existing = await adminAuth.getUserByEmail(input.email);
          createdUserUid = existing.uid;
        } catch (err: any) {
          if (String(err?.code) !== "auth/user-not-found") {
            throw err;
          }
          const created = await adminAuth.createUser({ email: input.email });
          createdUserUid = created.uid;
        }

        try {
          return await sendPasswordResetEmail(input.email);
        } finally {
          if (createdUserUid) {
            await adminAuth.deleteUser(createdUserUid);
          }
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
