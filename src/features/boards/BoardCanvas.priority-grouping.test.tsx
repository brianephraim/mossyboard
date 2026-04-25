import assert from "node:assert/strict";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BoardCanvas } from "./BoardCanvas";
import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";
import type { BoardDetailSearch, LoadedBoard } from "./types";

const board: LoadedBoard = {
  id: "board-1",
  name: "Test board",
  updatedAt: "2026-04-24T12:00:00.000Z",
  columnCount: 2,
  cardCount: 3,
  columns: [
    {
      id: "column-1",
      title: "Backlog",
      position: "1000",
      version: 3,
      cardCount: 2,
      cards: [
        {
          id: "card-1",
          title: "Add analytics",
          description: "",
          priority: "high",
          position: "1000",
          version: 0,
        },
        {
          id: "card-2",
          title: "Trim homepage copy",
          description: "",
          priority: "low",
          position: "2000",
          version: 0,
        },
      ],
    },
    {
      id: "column-2",
      title: "In progress",
      position: "2000",
      version: 5,
      cardCount: 1,
      cards: [
        {
          id: "card-3",
          title: "QA checkout flow",
          description: "",
          priority: "none",
          position: "1000",
          version: 0,
        },
      ],
    },
  ],
};

const priorityGroupedSearch: BoardDetailSearch = {
  card: undefined,
  view: "board",
  groupBy: "priority",
  priority: [],
};

describe("BoardCanvas priority grouping", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps real columns and adds priority headers inside them", () => {
    render(
      <TamaguiRootProvider>
        <BoardCanvas
          board={board}
          search={priorityGroupedSearch}
          canReorder={false}
          groupedBoardReorderEnabled={false}
          onToggleGroupedBoardReorderEnabled={vi.fn()}
          onDragEnd={vi.fn()}
          onOpenCard={vi.fn()}
          onOpenCreateCard={vi.fn()}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
        />
      </TamaguiRootProvider>,
    );

    const backlogColumn = screen.getByRole("region", { name: /backlog column/i });
    const inProgressColumn = screen.getByRole("region", { name: /in progress column/i });

    expect(screen.getAllByRole("button", { name: /^rename$/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^\+ add card$/i })).toHaveLength(2);

    assert.ok(within(backlogColumn).getByRole("heading", { name: "Backlog" }));
    assert.ok(within(backlogColumn).getByRole("heading", { name: "High" }));
    assert.ok(within(backlogColumn).getByRole("heading", { name: "Low" }));
    assert.ok(within(inProgressColumn).getByRole("heading", { name: "In progress" }));
    assert.ok(within(inProgressColumn).getByRole("heading", { name: "No priority" }));
  });

  it("renders the priority-mode reorder opt-in checkbox", () => {
    const onToggleGroupedBoardReorderEnabled = vi.fn();

    render(
      <TamaguiRootProvider>
        <BoardCanvas
          board={board}
          search={priorityGroupedSearch}
          canReorder={false}
          groupedBoardReorderEnabled={false}
          onToggleGroupedBoardReorderEnabled={onToggleGroupedBoardReorderEnabled}
          onDragEnd={vi.fn()}
          onOpenCard={vi.fn()}
          onOpenCreateCard={vi.fn()}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
        />
      </TamaguiRootProvider>,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: /allow re-ordering in this view, which will impact the user order/i,
    });
    fireEvent.click(checkbox);

    expect(onToggleGroupedBoardReorderEnabled).toHaveBeenCalledWith(true);
  });

  it("shows column move controls when grouped reorder is enabled", () => {
    render(
      <TamaguiRootProvider>
        <BoardCanvas
          board={board}
          search={priorityGroupedSearch}
          canReorder={false}
          groupedBoardReorderEnabled
          onToggleGroupedBoardReorderEnabled={vi.fn()}
          onDragEnd={vi.fn()}
          onOpenCard={vi.fn()}
          onOpenCreateCard={vi.fn()}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
        />
      </TamaguiRootProvider>,
    );

    expect(screen.getAllByRole("button", { name: /move column/i })).toHaveLength(4);
  });
});
