import { createFileRoute } from "@tanstack/react-router";

import { VerifyEmailScreen } from "../features/boards/VerifyEmailScreen";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: VerifyEmailRoute,
});

function VerifyEmailRoute() {
  const search = Route.useSearch();

  return <VerifyEmailScreen redirect={search.redirect} />;
}
