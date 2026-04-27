import assert from "node:assert/strict";
import { cleanup, render, screen, within } from "@testing-library/react";
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
          columnId: "column-1",
          title: "Add analytics",
          description: "",
          priority: "high",
          position: "1000",
          version: 0,
          tags: [],
        },
        {
          id: "card-2",
          columnId: "column-1",
          title: "Trim homepage copy",
          description: "",
          priority: "low",
          position: "2000",
          version: 0,
          tags: [],
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
          columnId: "column-2",
          title: "QA checkout flow",
          description: "",
          priority: "none",
          position: "1000",
          version: 0,
          tags: [],
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
  tags: [],
};

const filteredColumnSearch: BoardDetailSearch = {
  card: undefined,
  view: "board",
  groupBy: "column",
  priority: ["high", "low"],
  tags: [],
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
          onRenameCardTitle={vi.fn().mockResolvedValue(undefined)}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
          availableTags={[]}
          onAddTag={async () => undefined}
          onDetachTag={async () => undefined}
        />
      </TamaguiRootProvider>,
    );

    const backlogColumn = screen.getByRole("region", { name: /backlog column/i });
    const inProgressColumn = screen.getByRole("region", { name: /in progress column/i });

    // Column titles are now always inline-editable inputs (no separate "Rename" button).
    expect(screen.getAllByRole("textbox", { name: /column title/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^\+ add card$/i })).toHaveLength(2);

    assert.ok(within(backlogColumn).getByRole("textbox", { name: /column title/i }));
    assert.ok(within(backlogColumn).getByDisplayValue("Backlog"));
    assert.ok(within(backlogColumn).getByRole("heading", { name: "High" }));
    assert.ok(within(backlogColumn).getByRole("heading", { name: "Low" }));
    assert.ok(within(inProgressColumn).getByRole("textbox", { name: /column title/i }));
    assert.ok(within(inProgressColumn).getByDisplayValue("In progress"));
    assert.ok(within(inProgressColumn).getByRole("heading", { name: "No priority" }));
  });

  it("does not expose the priority-mode reorder opt-in checkbox", () => {
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
          onRenameCardTitle={vi.fn().mockResolvedValue(undefined)}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
          availableTags={[]}
          onAddTag={async () => undefined}
          onDetachTag={async () => undefined}
        />
      </TamaguiRootProvider>,
    );

    expect(
      screen.queryByRole("checkbox", {
        name: /allow re-ordering in this view, which will impact the user order/i,
      }),
    ).toBeNull();
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
          onRenameCardTitle={vi.fn().mockResolvedValue(undefined)}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
          availableTags={[]}
          onAddTag={async () => undefined}
          onDetachTag={async () => undefined}
        />
      </TamaguiRootProvider>,
    );

    expect(screen.getAllByRole("button", { name: /move column/i })).toHaveLength(4);
  });

  it("shows the shared reorder opt-in notice for priority-filtered columns", () => {
    render(
      <TamaguiRootProvider>
        <BoardCanvas
          board={board}
          search={filteredColumnSearch}
          canReorder={false}
          groupedBoardReorderEnabled={false}
          onToggleGroupedBoardReorderEnabled={vi.fn()}
          onDragEnd={vi.fn()}
          onOpenCard={vi.fn()}
          onOpenCreateCard={vi.fn()}
          onRenameCardTitle={vi.fn().mockResolvedValue(undefined)}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
          availableTags={[]}
          onAddTag={async () => undefined}
          onDetachTag={async () => undefined}
        />
      </TamaguiRootProvider>,
    );

    assert.ok(
      screen.getByText(
        /Priority-filtered columns are display-only by default\. Visible cards keep their saved user order underneath/i,
      ),
    );
    expect(
      screen.queryByRole("checkbox", {
        name: /allow re-ordering in this view, which will impact the user order/i,
      }),
    ).toBeNull();
  });

  it("enables card move controls without enabling column move controls in filtered column mode", () => {
    render(
      <TamaguiRootProvider>
        <BoardCanvas
          board={board}
          search={filteredColumnSearch}
          canReorder={false}
          groupedBoardReorderEnabled
          onToggleGroupedBoardReorderEnabled={vi.fn()}
          onDragEnd={vi.fn()}
          onOpenCard={vi.fn()}
          onOpenCreateCard={vi.fn()}
          onRenameCardTitle={vi.fn().mockResolvedValue(undefined)}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
          availableTags={[]}
          onAddTag={async () => undefined}
          onDetachTag={async () => undefined}
        />
      </TamaguiRootProvider>,
    );

    expect(screen.queryByRole("button", { name: /move column/i })).toBeNull();
    expect(screen.getAllByRole("button", { name: /move card/i }).length).toBeGreaterThan(0);
  });
});
