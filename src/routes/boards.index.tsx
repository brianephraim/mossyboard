import { createFileRoute } from "@tanstack/react-router";

import { BoardsIndexScreen } from "../features/boards/BoardsIndexScreen";
import { parseBoardsIndexSearch } from "../features/boards/model";

export const Route = createFileRoute("/boards/")({
  validateSearch: (search) => parseBoardsIndexSearch(search),
  component: BoardsIndexRoute,
});

function BoardsIndexRoute() {
  const search = Route.useSearch();

  return <BoardsIndexScreen status={search.status} />;
}
