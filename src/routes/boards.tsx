import { createFileRoute } from "@tanstack/react-router";

import { BoardRouteGate } from "../features/boards/access";
import { BoardsIndexScreen } from "../features/boards/BoardsIndexScreen";
import { parseBoardsIndexSearch } from "../features/boards/model";

export const Route = createFileRoute("/boards")({
  validateSearch: (search) => parseBoardsIndexSearch(search),
  component: BoardsRoute,
});

function BoardsRoute() {
  const search = Route.useSearch();

  return (
    <BoardRouteGate>
      <BoardsIndexScreen status={search.status} />
    </BoardRouteGate>
  );
}
