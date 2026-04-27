import type { BoardDetailSearch, CardPriority } from "../types";
import type { ColumnCardsSlice } from "./keys";

/**
 * Identify which `ColumnCardsSlice` a card with the given priority belongs to
 * for the active search/grouping state. Used to address the right cache
 * partition when patching slice queries.
 */
export function getCardSlice(
  columnId: string,
  cardPriority: CardPriority,
  search: BoardDetailSearch,
): ColumnCardsSlice {
  if (search.groupBy === "priority") {
    return { columnId, mode: "priority", priority: cardPriority };
  }
  if (search.priority.length > 0) {
    return { columnId, mode: "filtered", priorities: [...search.priority] };
  }
  return { columnId, mode: "all" };
}
