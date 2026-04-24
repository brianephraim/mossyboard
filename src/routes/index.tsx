import { createFileRoute } from "@tanstack/react-router";

import { parseSafeRedirectTo } from "../auth/searchParams";
import { PublicAuthLanding } from "../features/auth/PublicAuthLanding";

export const Route = createFileRoute("/")({
  validateSearch: (search) => {
    const raw =
      typeof search.redirectTo === "string"
        ? search.redirectTo
        : typeof search.redirect === "string"
          ? search.redirect
          : undefined;

    return {
      redirectTo: raw !== undefined ? parseSafeRedirectTo(raw, undefined) : undefined,
    };
  },
  component: Home,
});

function Home() {
  const search = Route.useSearch();

  return <PublicAuthLanding redirectTo={search.redirectTo} />;
}
