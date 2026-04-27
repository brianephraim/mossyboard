import { useEffect } from "react";

import type { ColumnCardsSlice } from "./keys";
import type { ColumnCardItem } from "./useColumnCards";
import { useColumnCards } from "./useColumnCards";

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
  useEffect(() => {
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
