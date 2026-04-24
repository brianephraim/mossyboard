import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { getUser } from "../auth/client";
import { parseSafeRedirectTo } from "../auth/searchParams";
import { SessionExpiredDialog } from "../features/auth/SessionExpiredDialog";
import { useAuthAnnounceOptional } from "../features/auth/AuthAnnounceContext";

import { isTrpcUnauthorizedError } from "./is-unauthorized";

export function TrpcAuthErrorBridge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const announce = useAuthAnnounceOptional();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const redirectToCurrent = useRouterState({
    select: (s) => `${s.location.pathname}${s.location.searchStr ?? ""}`,
  });
  const [writeExpiredOpen, setWriteExpiredOpen] = useState(false);
  const readRedirected = useRef(false);

  const onSignInAgain = useCallback(() => {
    const safe = parseSafeRedirectTo(redirectToCurrent, undefined);
    void navigate({
      to: "/auth",
      search: { mode: "signin", reason: "session-expired", redirectTo: safe },
    });
  }, [navigate, redirectToCurrent]);

  useEffect(() => {
    readRedirected.current = false;
  }, [pathname, redirectToCurrent]);

  useEffect(() => {
    const mutationCache = queryClient.getMutationCache();

    return mutationCache.subscribe((event) => {
      if (event.type !== "updated") {
        return;
      }

      const mutation = event.mutation;
      if (!mutation || mutation.state.status !== "error") {
        return;
      }

      const err = mutation.state.error;
      if (!isTrpcUnauthorizedError(err)) {
        return;
      }

      if (!getUser()) {
        return;
      }

      if (pathname.startsWith("/auth") || pathname.startsWith("/verify-email")) {
        return;
      }

      announce?.announce("Session expired. Your change was not saved.");
      setWriteExpiredOpen(true);
    });
  }, [announce, pathname, queryClient]);

  useEffect(() => {
    const queryCache = queryClient.getQueryCache();

    return queryCache.subscribe((event) => {
      if (event.type !== "updated") {
        return;
      }

      const query = event.query;
      if (!query || query.state.status !== "error") {
        return;
      }

      const err = query.state.error;
      if (!isTrpcUnauthorizedError(err)) {
        return;
      }

      if (!getUser()) {
        return;
      }

      if (pathname.startsWith("/auth") || pathname.startsWith("/verify-email")) {
        return;
      }

      if (readRedirected.current) {
        return;
      }

      readRedirected.current = true;
      const safe = parseSafeRedirectTo(redirectToCurrent, undefined);
      void navigate({
        to: "/auth",
        search: { mode: "signin", reason: "session-expired", redirectTo: safe },
        replace: true,
      });
    });
  }, [navigate, pathname, queryClient, redirectToCurrent]);

  return (
    <SessionExpiredDialog
      open={writeExpiredOpen}
      onOpenChange={setWriteExpiredOpen}
      onSignInAgain={onSignInAgain}
    />
  );
}
