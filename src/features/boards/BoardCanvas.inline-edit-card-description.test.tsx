import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BoardCanvas } from "./BoardCanvas";
import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";
import type { BoardDetailSearch, LoadedBoard } from "./types";

const board: LoadedBoard = {
  id: "board-1",
  name: "Test board",
  updatedAt: "2026-04-24T12:00:00.000Z",
  columnCount: 1,
  cardCount: 1,
  columns: [
    {
      id: "column-1",
      title: "To do",
      position: "1000",
      version: 3,
      cardCount: 1,
      cards: [
        {
          id: "card-1",
          columnId: "column-1",
          title: "Initial title",
          description: "Initial description",
          priority: "high",
          position: "1000",
          version: 7,
        },
      ],
    },
  ],
};

const search: BoardDetailSearch = {
  card: undefined,
  view: "board",
  groupBy: "column",
  priority: [],
};

describe("BoardCanvas inline card description edit", () => {
  afterEach(() => cleanup());

  it("blur saves: trims end and passes expectedVersion", async () => {
    const onRenameCardTitle = vi.fn().mockResolvedValue(undefined);

    render(
      <TamaguiRootProvider>
        <BoardCanvas
          board={board}
          search={search}
          canReorder={false}
          groupedBoardReorderEnabled={false}
          onToggleGroupedBoardReorderEnabled={vi.fn()}
          onDragEnd={vi.fn()}
          onOpenCard={vi.fn()}
          onOpenCreateCard={vi.fn()}
          onRenameCardTitle={onRenameCardTitle}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
        />
      </TamaguiRootProvider>,
    );

    const field = screen.getByRole("textbox", { name: /card description/i });
    fireEvent.change(field, { target: { value: "New description   " } });
    fireEvent.blur(field);

    await vi.waitFor(() => {
      expect(onRenameCardTitle).toHaveBeenCalledWith({
        cardId: "card-1",
        title: "Initial title",
        description: "New description",
        priority: "high",
        expectedVersion: 7,
      });
    });
  });

  it("Enter saves: submits once even if blur occurs", async () => {
    const onRenameCardTitle = vi.fn().mockResolvedValue(undefined);

    render(
      <TamaguiRootProvider>
        <BoardCanvas
          board={board}
          search={search}
          canReorder={false}
          groupedBoardReorderEnabled={false}
          onToggleGroupedBoardReorderEnabled={vi.fn()}
          onDragEnd={vi.fn()}
          onOpenCard={vi.fn()}
          onOpenCreateCard={vi.fn()}
          onRenameCardTitle={onRenameCardTitle}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
        />
      </TamaguiRootProvider>,
    );

    const field = screen.getByRole("textbox", { name: /card description/i });
    field.focus();
    fireEvent.change(field, { target: { value: "New description via Enter" } });
    fireEvent.keyDown(field, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.blur(field);

    await vi.waitFor(() => {
      expect(onRenameCardTitle).toHaveBeenCalledTimes(1);
    });
  });

  it("Open still works: clicking Open calls onOpenCard and does not focus description", () => {
    const onOpenCard = vi.fn();

    render(
      <TamaguiRootProvider>
        <BoardCanvas
          board={board}
          search={search}
          canReorder={false}
          groupedBoardReorderEnabled={false}
          onToggleGroupedBoardReorderEnabled={vi.fn()}
          onDragEnd={vi.fn()}
          onOpenCard={onOpenCard}
          onOpenCreateCard={vi.fn()}
          onRenameCardTitle={vi.fn().mockResolvedValue(undefined)}
          onRenameColumn={vi.fn().mockResolvedValue(undefined)}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
          onMovePriorityGroupCard={vi.fn()}
        />
      </TamaguiRootProvider>,
    );

    const description = screen.getByRole("textbox", { name: /card description/i });
    expect(document.activeElement).not.toBe(description);

    fireEvent.click(screen.getByRole("button", { name: /^open$/i }));

    expect(onOpenCard).toHaveBeenCalledWith("card-1");
    expect(document.activeElement).not.toBe(description);
  });
});
