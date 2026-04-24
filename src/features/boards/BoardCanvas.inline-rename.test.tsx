import assert from "node:assert/strict";
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
  cardCount: 0,
  columns: [
    {
      id: "column-1",
      title: "To do",
      position: "1000",
      version: 3,
      cardCount: 0,
      cards: [],
    },
  ],
};

const search: BoardDetailSearch = {
  card: undefined,
  view: "board",
  groupBy: "column",
  priority: [],
};

describe("BoardCanvas inline column rename", () => {
  afterEach(() => {
    cleanup();
  });

  it("commits a new title on Enter after editing", async () => {
    const onRenameColumn = vi.fn().mockResolvedValue(undefined);

    render(
      <TamaguiRootProvider>
        <BoardCanvas
          board={board}
          search={search}
          canReorder={false}
          onDragEnd={vi.fn()}
          onOpenCard={vi.fn()}
          onOpenCreateCard={vi.fn()}
          onRenameColumn={onRenameColumn}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
        />
      </TamaguiRootProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^rename$/i }));

    const field = screen.getByRole("textbox", { name: /column title/i });
    fireEvent.change(field, { target: { value: "To do-renamed" } });
    assert.equal((field as HTMLInputElement).value, "To do-renamed");
    fireEvent.keyDown(field, { key: "Enter" });

    await vi.waitFor(() => {
      expect(onRenameColumn).toHaveBeenCalledWith({
        columnId: "column-1",
        title: "To do-renamed",
        expectedVersion: 3,
      });
    });
  });

  it("does not call onRenameColumn when the edit is cancelled with Escape", () => {
    const onRenameColumn = vi.fn();

    render(
      <TamaguiRootProvider>
        <BoardCanvas
          board={board}
          search={search}
          canReorder={false}
          onDragEnd={vi.fn()}
          onOpenCard={vi.fn()}
          onOpenCreateCard={vi.fn()}
          onRenameColumn={onRenameColumn}
          renamePendingColumnId={null}
          onOpenCreateColumnAfter={vi.fn()}
          onMoveColumn={vi.fn()}
          onMoveCard={vi.fn()}
        />
      </TamaguiRootProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^rename$/i }));
    const field = screen.getByRole("textbox", { name: /column title/i });
    fireEvent.change(field, { target: { value: "Discarded" } });
    fireEvent.keyDown(field, { key: "Escape" });

    expect(screen.getByRole("button", { name: /^rename$/i })).toBeTruthy();
    expect(onRenameColumn).not.toHaveBeenCalled();
  });
});
