import { createFileRoute } from "@tanstack/react-router";

import { BoardRouteGate } from "../features/boards/access";
import { BoardDetailScreen } from "../features/boards/BoardDetailScreen";

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
      <BoardDetailScreen boardId={params.boardId} rawSearch={search} />
    </BoardRouteGate>
  );
}
