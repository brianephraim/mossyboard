import { createFileRoute } from "@tanstack/react-router";

import { VerifyEmailScreen } from "../features/boards/VerifyEmailScreen";

import { parseSafeRedirectTo } from "../auth/searchParams";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search) => ({
    redirectTo: parseSafeRedirectTo(search.redirectTo, search.redirect),
  }),
  component: VerifyEmailRoute,
});

function VerifyEmailRoute() {
  const search = Route.useSearch();

  return <VerifyEmailScreen redirectTo={search.redirectTo} />;
}
