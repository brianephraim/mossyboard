import type { BoardDetailSearch, CardPriority } from "../types";

export type ColumnCardsSlice =
  | { columnId: string; mode: "all" }
  | { columnId: string; mode: "filtered"; priorities: CardPriority[] }
  | { columnId: string; mode: "priority"; priority: CardPriority };

const PRIORITY_RENDER_ORDER: ReadonlyArray<CardPriority> = ["none", "low", "medium", "high"];

export function describeColumnSlice(
  columnId: string,
  search: BoardDetailSearch,
): ColumnCardsSlice[] {
  if (search.groupBy === "priority") {
    const visible =
      search.priority.length === 0
        ? PRIORITY_RENDER_ORDER
        : PRIORITY_RENDER_ORDER.filter((p) => search.priority.includes(p));
    return visible.map((priority) => ({ columnId, mode: "priority", priority }));
  }

  if (search.priority.length > 0) {
    return [{ columnId, mode: "filtered", priorities: [...search.priority] }];
  }

  return [{ columnId, mode: "all" }];
}

export function sliceQueryInput(slice: ColumnCardsSlice): {
  columnId: string;
  priority?: CardPriority | CardPriority[];
  limit: number;
} {
  if (slice.mode === "priority") {
    return { columnId: slice.columnId, priority: slice.priority, limit: 100 };
  }
  if (slice.mode === "filtered") {
    return { columnId: slice.columnId, priority: slice.priorities, limit: 100 };
  }
  return { columnId: slice.columnId, limit: 100 };
}
