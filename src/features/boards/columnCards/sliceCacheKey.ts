import type { ColumnCardsSlice } from "./keys";

/**
 * Stable string identifier for a slice; used to dedupe/aggregate items in the
 * pane-level cards-by-column store.
 */
export function sliceCacheKey(slice: ColumnCardsSlice): string {
  if (slice.mode === "all") {
    return `${slice.columnId}::all`;
  }
  if (slice.mode === "priority") {
    return `${slice.columnId}::priority::${slice.priority}`;
  }
  const sorted = [...slice.priorities].sort();
  return `${slice.columnId}::filtered::${sorted.join(",")}`;
}
