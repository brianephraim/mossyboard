import { createFileRoute, Outlet } from "@tanstack/react-router";

import { BoardRouteGate } from "../features/boards/access";

export const Route = createFileRoute("/boards")({
  component: BoardsLayoutRoute,
});

function BoardsLayoutRoute() {
  return (
    <BoardRouteGate>
      <Outlet />
    </BoardRouteGate>
  );
}
