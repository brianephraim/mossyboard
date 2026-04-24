import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { YStack } from "@tamagui/stacks";

import { useAuthSession, useRequiresEmailVerification } from "../../auth/session";
import { BoardPageChrome, BoardStateCard } from "./ui";

export function BoardRouteGate({ children }: Readonly<{ children: ReactNode }>) {
  const session = useAuthSession();
  const requiresEmailVerification = useRequiresEmailVerification();
  const navigate = useNavigate();
  const location = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      search: state.location.searchStr,
    }),
  });
  const isBoardPath = location.pathname.startsWith("/boards");
  const redirectTarget = isBoardPath ? `${location.pathname}${location.search}` : "/boards";

  useEffect(() => {
    if (!session.hasResolvedInitialAuth || !isBoardPath) {
      return;
    }

    if (!session.isSignedIn) {
      void navigate({
        to: "/auth",
        search: { redirect: redirectTarget },
        replace: true,
      });
      return;
    }

    if (requiresEmailVerification && !session.user?.emailVerified) {
      void navigate({
        to: "/verify-email",
        search: { redirect: redirectTarget },
        replace: true,
      });
    }
  }, [
    navigate,
    isBoardPath,
    redirectTarget,
    requiresEmailVerification,
    session.hasResolvedInitialAuth,
    session.isSignedIn,
    session.user,
  ]);

  if (!session.hasResolvedInitialAuth) {
    return (
      <CenteredBoardState
        title="Checking your workspace session"
        description="We’re making sure your board access is ready before we load anything expensive."
      />
    );
  }

  if (!session.isSignedIn) {
    return (
      <CenteredBoardState
        title="Redirecting to sign in"
        description="Board routes are protected. We’re sending you to the auth screen now."
      />
    );
  }

  if (requiresEmailVerification && !session.user?.emailVerified) {
    return (
      <CenteredBoardState
        title="Redirecting to email verification"
        description="This workspace requires a verified email before loading protected board content."
      />
    );
  }

  return children;
}

export function CenteredBoardState({
  title,
  description,
  actions,
  children,
}: Readonly<{
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
}>) {
  return (
    <BoardPageChrome>
      <YStack minHeight="100vh" alignItems="center" justifyContent="center" padding="$4" gap="$3">
        <YStack width="min(720px, 100%)" gap="$3">
          <BoardStateCard title={title} description={description} actions={actions} />
          {children}
        </YStack>
      </YStack>
    </BoardPageChrome>
  );
}
