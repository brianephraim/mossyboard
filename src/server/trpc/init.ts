import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";

import type { TrpcContext } from "./context";
import { logger } from "../logging/logger";
import { adminAuth } from "../auth/admin";

export const t = initTRPC.context<TrpcContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === "BAD_REQUEST" && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

export const trpcMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const start = Date.now();
  try {
    const result = await next();
    const durationMs = Date.now() - start;
    const ok = result.ok ? true : false;

    if (!ok) {
      logger.warn({ requestId: ctx.requestId, path, type, durationMs, ok }, "trpc");
    } else if (process.env.KANBAN_LOG_TRPC === "1") {
      logger.info({ requestId: ctx.requestId, path, type, durationMs, ok }, "trpc");
    }

    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    logger.error(
      {
        requestId: ctx.requestId,
        path,
        type,
        durationMs,
      },
      "trpc_error",
    );
    throw err;
  }
});

export const publicProcedure = t.procedure.use(trpcMiddleware);

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const header = ctx.authHeader;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing Authorization token" });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return next({
      ctx: { ...ctx, userId: decoded.uid, userEmail: decoded.email ?? null },
    });
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token" });
  }
});

// Initial code set (extend as needed):
// - BAD_REQUEST: validation and client input issues
// - UNAUTHORIZED: auth failures
// - FORBIDDEN: permission failures
// - NOT_FOUND: missing resources
// - CONFLICT: optimistic concurrency conflicts
// - INTERNAL_SERVER_ERROR: unexpected failures
export const trpcErrors = {
  badRequest(message: string) {
    return new TRPCError({ code: "BAD_REQUEST", message });
  },
  unauthorized(message = "Unauthorized") {
    return new TRPCError({ code: "UNAUTHORIZED", message });
  },
  forbidden(message = "Forbidden") {
    return new TRPCError({ code: "FORBIDDEN", message });
  },
  notFound(message = "Not found") {
    return new TRPCError({ code: "NOT_FOUND", message });
  },
  conflict(message = "Conflict") {
    return new TRPCError({ code: "CONFLICT", message });
  },
};
