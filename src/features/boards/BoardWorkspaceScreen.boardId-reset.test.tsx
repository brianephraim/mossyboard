import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

// Repro for the prod-only "cards disappear on board revisit" race.
//
// `BoardWorkspaceScreen` lifts each `SliceHydrator`'s items into local state via
// a callback fired in `useLayoutEffect`. When the user navigates A → B → A and
// the query cache returns byte-identical data on revisit, react-query's
// structural sharing keeps the items reference stable, so the SliceHydrator's
// effect doesn't refire after the parent's boardId-change reset. The previous
// bug: a post-paint `useEffect` cleared the lifted state AFTER the children
// populated it, leaving the synthesized board with empty columns until something
// forced a refire (e.g. adding a card, which mutates that one column's data).
//
// The fix: clear during render via a prev-id ref so the reset happens before
// the children commit. This test mirrors `BoardWorkspaceScreen`'s state-reset
// pattern with a minimal hydrator child to assert the invariant in isolation
// from PaneCardsHydrator's own deps.

type ItemsByColumn = Record<string, ReadonlyArray<string>>;

/**
 * Minimal stand-in for `SliceHydrator`: pushes its `items` prop up via
 * `onItemsChange` in a layout effect, with `[items, onItemsChange]` deps —
 * matching the real component's effect contract.
 */
function PushItems({
  columnId,
  items,
  onItemsChange,
}: {
  columnId: string;
  items: ReadonlyArray<string>;
  onItemsChange: (columnId: string, items: ReadonlyArray<string>) => void;
}) {
  useLayoutEffect(() => {
    onItemsChange(columnId, items);
  }, [columnId, items, onItemsChange]);
  return null;
}

/** Mirrors `BoardWorkspaceScreen`'s lifted-state + boardId-change reset pattern. */
function Harness({
  boardId,
  cachedItemsForBoard,
}: {
  boardId: string;
  cachedItemsForBoard: ItemsByColumn;
}) {
  const [items, setItems] = useState<ItemsByColumn>({});

  const prevBoardIdRef = useRef(boardId);
  if (prevBoardIdRef.current !== boardId) {
    prevBoardIdRef.current = boardId;
    setItems({});
  }

  const onItemsChange = useCallback((columnId: string, nextItems: ReadonlyArray<string>) => {
    setItems((prev) => (prev[columnId] === nextItems ? prev : { ...prev, [columnId]: nextItems }));
  }, []);

  return (
    <div>
      {Object.entries(cachedItemsForBoard).map(([columnId, columnItems]) => (
        <PushItems
          key={columnId}
          columnId={columnId}
          items={columnItems}
          onItemsChange={onItemsChange}
        />
      ))}
      <ul>
        {Object.entries(items).flatMap(([columnId, columnItems]) =>
          columnItems.map((title) => (
            <li key={`${columnId}::${title}`} data-column={columnId}>
              {title}
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

function visibleTitles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("li")).map((li) => li.textContent ?? "");
}

describe("BoardWorkspaceScreen lifted-slice-state reset on boardId change", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps items visible after A → B → A revisit when items references are stable", () => {
    // Stable references mimic react-query's structural sharing on cache hit.
    const itemsA: ItemsByColumn = {
      "col-a1": ["Card A1"],
      "col-a2": ["Card A2"],
    };
    const itemsB: ItemsByColumn = {
      "col-b1": ["Card B1"],
    };

    const { rerender, container } = render(<Harness boardId="A" cachedItemsForBoard={itemsA} />);
    expect(visibleTitles(container).sort()).toEqual(["Card A1", "Card A2"]);

    rerender(<Harness boardId="B" cachedItemsForBoard={itemsB} />);
    expect(visibleTitles(container)).toEqual(["Card B1"]);

    // Revisit A. Same `itemsA` reference (and same nested array refs) — the bug
    // case. Without the render-time reset, the post-paint useEffect-based reset
    // would clear the populated state after the layout effect already fired,
    // and the layout effect wouldn't refire because its `items` dep is stable.
    rerender(<Harness boardId="A" cachedItemsForBoard={itemsA} />);
    expect(visibleTitles(container).sort()).toEqual(["Card A1", "Card A2"]);
  });
});
