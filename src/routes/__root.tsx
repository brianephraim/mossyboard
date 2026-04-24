/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PortalProvider } from "@tamagui/portal";

import "../tamagui.css";

import { AppNav } from "../navigation/AppNav";
import { TrpcProvider } from "../trpc/provider";
import { startAuthSession } from "../auth/client";
import { StoreProvider } from "../store/StoreProvider";
import { TamaguiRootProvider } from "../tamagui/TamaguiRootProvider";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kanban" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const shouldHideScaffoldNav =
    pathname.startsWith("/boards") || pathname.startsWith("/verify-email");

  return (
    <RootDocument>
      <Providers>
        <TamaguiRootProvider>
          <PortalProvider shouldAddRootHost>
            {shouldHideScaffoldNav ? null : <AppNav />}
            <Outlet />
          </PortalProvider>
        </TamaguiRootProvider>
      </Providers>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  // TanStack Start requires the HTML document shell to be rendered by the root route.
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient());
  useEffect(() => {
    startAuthSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TrpcProvider queryClient={queryClient}>{children}</TrpcProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}
