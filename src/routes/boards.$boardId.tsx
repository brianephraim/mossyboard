import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { BoardRouteGate, CenteredBoardState } from "../features/boards/access";

const BoardDetailScreen = lazy(() =>
  import("../features/boards/BoardDetailScreen").then((m) => ({ default: m.BoardDetailScreen })),
);

export const Route = createFileRoute("/boards/$boardId")({
  validateSearch: (search) => ({
    card: typeof search.card === "string" ? search.card : undefined,
    view: search.view === "list" ? "list" : "board",
    groupBy: search.groupBy === "priority" ? "priority" : "column",
    priority: typeof search.priority === "string" ? search.priority : undefined,
  }),
  component: BoardDetailRoute,
});

function BoardDetailRoute() {
  const params = Route.useParams();
  const search = Route.useSearch();

  return (
    <BoardRouteGate>
      <Suspense
        fallback={
          <CenteredBoardState
            title="Loading board"
            description="We’re fetching this board’s columns and cards."
          />
        }
      >
        <BoardDetailScreen boardId={params.boardId} rawSearch={search} />
      </Suspense>
    </BoardRouteGate>
  );
}
