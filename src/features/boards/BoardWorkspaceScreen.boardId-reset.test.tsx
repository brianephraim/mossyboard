import { useCallback, useMemo, useRef, useState } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaneCardsHydrator } from "./columnCards/PaneCardsHydrator";
import { synthesizeBoardFromStructure } from "./columnCards/synthesizeBoard";
import type { ColumnCardItem } from "./columnCards/useColumnCards";
import type { SlicePagination } from "./columnCards/SliceHydrator";
import type { BoardDetailSearch, LoadedBoardStructure } from "./types";

// Repro for the prod-only "cards disappear on board revisit" race.
//
// `BoardWorkspaceScreen` lifts each `SliceHydrator`'s items into local state via a
// callback fired in `useLayoutEffect`. When the user navigates A → B → A and the
// query cache returns byte-identical data on revisit, react-query's structural
// sharing keeps the items reference stable, so the SliceHydrator's effect doesn't
// refire after the parent's boardId-change reset. The previous bug: a post-paint
// `useEffect` cleared the lifted state AFTER the children populated it, leaving
// the synthesized board with empty columns until something forced a refire (e.g.
// adding a card, which mutates that one column's data).
//
// The fix: clear during render via a prev-id ref so the reset happens before the
// children commit. This test mirrors `BoardWorkspaceScreen`'s pattern in a small
// harness and asserts cards remain visible after revisit with stable item refs.

vi.mock("./columnCards/useColumnCards", () => {
  const map = new Map<string, ColumnCardItem[]>();
  return {
    __setColumnItems: (columnId: string, items: ColumnCardItem[]) => {
      map.set(columnId, items);
    },
    __resetColumnItems: () => map.clear(),
    useColumnCards: (slice: { columnId: string }) => ({
      items: map.get(slice.columnId) ?? [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      error: null,
    }),
  };
});

const mocked = await import("./columnCards/useColumnCards");
const setColumnItems = (
  mocked as unknown as { __setColumnItems: (columnId: string, items: ColumnCardItem[]) => void }
).__setColumnItems;
const resetColumnItems = (mocked as unknown as { __resetColumnItems: () => void })
  .__resetColumnItems;

type SliceItemsByColumn = Record<string, Record<string, ColumnCardItem[]>>;
type SlicePaginationByColumn = Record<string, Record<string, SlicePagination>>;

const search: BoardDetailSearch = {
  card: undefined,
  view: "board",
  groupBy: "column",
  priority: [],
  tags: [],
};

function unionSlicesByColumn(input: SliceItemsByColumn): Record<string, ColumnCardItem[]> {
  const result: Record<string, ColumnCardItem[]> = {};
  for (const [columnId, slices] of Object.entries(input)) {
    const merged = new Map<string, ColumnCardItem>();
    for (const items of Object.values(slices)) {
      for (const item of items) merged.set(item.id, item);
    }
    result[columnId] = [...merged.values()];
  }
  return result;
}

/** Mirrors the lifted-state + boardId-reset pattern in `BoardWorkspaceScreen`. */
function Harness({ boardId, structure }: { boardId: string; structure: LoadedBoardStructure }) {
  const [sliceItems, setSliceItems] = useState<SliceItemsByColumn>({});
  const [, setSlicePagination] = useState<SlicePaginationByColumn>({});

  const prevBoardIdRef = useRef(boardId);
  if (prevBoardIdRef.current !== boardId) {
    prevBoardIdRef.current = boardId;
    setSliceItems({});
    setSlicePagination({});
  }

  const onSliceItemsChange = useCallback(
    (columnId: string, sliceKey: string, items: ColumnCardItem[]) => {
      setSliceItems((prev) => {
        const colSlices = prev[columnId] ?? {};
        if (colSlices[sliceKey] === items) return prev;
        return { ...prev, [columnId]: { ...colSlices, [sliceKey]: items } };
      });
    },
    [],
  );

  const onSlicePaginationChange = useCallback(
    (columnId: string, sliceKey: string, pagination: SlicePagination) => {
      setSlicePagination((prev) => {
        const colSlices = prev[columnId] ?? {};
        const existing = colSlices[sliceKey];
        if (
          existing &&
          existing.hasNextPage === pagination.hasNextPage &&
          existing.isFetchingNextPage === pagination.isFetchingNextPage &&
          existing.fetchNextPage === pagination.fetchNextPage
        ) {
          return prev;
        }
        return { ...prev, [columnId]: { ...colSlices, [sliceKey]: pagination } };
      });
    },
    [],
  );

  const cardsByColumn = useMemo(() => unionSlicesByColumn(sliceItems), [sliceItems]);
  const board = synthesizeBoardFromStructure(structure, cardsByColumn);

  return (
    <div>
      <PaneCardsHydrator
        structure={structure}
        search={search}
        onSliceItemsChange={onSliceItemsChange}
        onSlicePaginationChange={onSlicePaginationChange}
      />
      <ul data-testid="cards">
        {board.columns.flatMap((column) =>
          column.cards.map((card) => (
            <li key={`${column.id}::${card.id}`} data-column={column.id}>
              {card.title}
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

const structureA: LoadedBoardStructure = {
  id: "board-a",
  name: "Board A",
  updatedAt: "2026-04-27T00:00:00.000Z",
  columns: [
    { id: "col-a1", title: "Backlog", position: "1000", version: 1 },
    { id: "col-a2", title: "Doing", position: "2000", version: 1 },
  ],
};

const structureB: LoadedBoardStructure = {
  id: "board-b",
  name: "Board B",
  updatedAt: "2026-04-27T00:00:00.000Z",
  columns: [{ id: "col-b1", title: "Inbox", position: "1000", version: 1 }],
};

// Cached items per column with a STABLE reference across renders. Mimics
// react-query's structural sharing returning the same array on cache hit.
const itemsA1: ColumnCardItem[] = [
  {
    id: "card-a1",
    columnId: "col-a1",
    title: "Card A1",
    description: "",
    priority: "none",
    position: "1000",
    version: 1,
    tags: [],
  },
];
const itemsA2: ColumnCardItem[] = [
  {
    id: "card-a2",
    columnId: "col-a2",
    title: "Card A2",
    description: "",
    priority: "none",
    position: "1000",
    version: 1,
    tags: [],
  },
];
const itemsB1: ColumnCardItem[] = [
  {
    id: "card-b1",
    columnId: "col-b1",
    title: "Card B1",
    description: "",
    priority: "none",
    position: "1000",
    version: 1,
    tags: [],
  },
];

function visibleCardTitles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("li")).map((li) => li.textContent ?? "");
}

describe("BoardWorkspaceScreen lifted-slice-state reset on boardId change", () => {
  afterEach(() => {
    cleanup();
    resetColumnItems();
  });

  it("keeps cards visible after A → B → A revisit when items references are stable", () => {
    setColumnItems("col-a1", itemsA1);
    setColumnItems("col-a2", itemsA2);
    setColumnItems("col-b1", itemsB1);

    const { rerender, container } = render(<Harness boardId="A" structure={structureA} />);
    expect(visibleCardTitles(container)).toEqual(["Card A1", "Card A2"]);

    rerender(<Harness boardId="B" structure={structureB} />);
    expect(visibleCardTitles(container)).toEqual(["Card B1"]);

    // Revisit A. `itemsA1` / `itemsA2` references are unchanged — the bug case.
    rerender(<Harness boardId="A" structure={structureA} />);
    expect(visibleCardTitles(container)).toEqual(["Card A1", "Card A2"]);
  });
});
