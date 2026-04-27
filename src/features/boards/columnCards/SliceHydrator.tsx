import { useEffect, useLayoutEffect } from "react";

import type { ColumnCardsSlice } from "./keys";
import type { ColumnCardItem } from "./useColumnCards";
import { useColumnCards } from "./useColumnCards";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type SlicePagination = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

/**
 * Renders nothing. Subscribes to the cards in a single slice via
 * `useColumnCards` and reports the resolved items + load state up to the
 * parent. One instance is mounted per `(columnId, sliceKey)` pair.
 */
export function SliceHydrator({
  slice,
  sliceKey,
  onItemsChange,
  onPaginationChange,
}: Readonly<{
  slice: ColumnCardsSlice;
  sliceKey: string;
  onItemsChange: (
    columnId: string,
    sliceKey: string,
    items: ColumnCardItem[],
    flags: { isLoading: boolean; error: unknown },
  ) => void;
  onPaginationChange?: (columnId: string, sliceKey: string, pagination: SlicePagination) => void;
}>) {
  const { items, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useColumnCards(slice);
  // Use a layout effect for items so that when an optimistic patch updates the
  // query cache (e.g. on drag-and-drop drop), the parent state setter fires
  // synchronously before paint. Otherwise @hello-pangea/dnd finishes its drop
  // animation before the parent re-renders the new card order, causing a
  // visible "snap back to original then snap to new" flicker.
  useIsomorphicLayoutEffect(() => {
    onItemsChange(slice.columnId, sliceKey, items, { isLoading, error });
  }, [slice.columnId, sliceKey, items, isLoading, error, onItemsChange]);
  useEffect(() => {
    if (!onPaginationChange) {
      return;
    }
    onPaginationChange(slice.columnId, sliceKey, {
      hasNextPage,
      isFetchingNextPage,
      fetchNextPage: () => {
        void fetchNextPage();
      },
    });
  }, [
    slice.columnId,
    sliceKey,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onPaginationChange,
  ]);
  return null;
}
