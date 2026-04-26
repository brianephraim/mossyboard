import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { CenteredBoardState } from "../features/boards/access";

const BoardWorkspaceScreen = lazy(() =>
  import("../features/boards/BoardWorkspaceScreen").then((m) => ({
    default: m.BoardWorkspaceScreen,
  })),
);

export const Route = createFileRoute("/boards/$boardId")({
  validateSearch: (search) => ({
    card: typeof search.card === "string" ? search.card : undefined,
    view: (search.view === "list" ? "list" : "board") as "board" | "list",
    groupBy: (search.groupBy === "priority" ? "priority" : "column") as "column" | "priority",
    priority: typeof search.priority === "string" ? search.priority : undefined,
    tags: typeof search.tags === "string" ? search.tags : undefined,
    drawer: typeof search.drawer === "string" ? search.drawer : undefined,
  }),
  component: BoardDetailRoute,
});

function BoardDetailRoute() {
  const params = Route.useParams();
  const search = Route.useSearch();

  return (
    <Suspense
      fallback={
        <CenteredBoardState
          title="Loading board"
          description="We’re fetching this board’s columns and cards."
        />
      }
    >
      <BoardWorkspaceScreen boardId={params.boardId} rawSearch={search} />
    </Suspense>
  );
}
