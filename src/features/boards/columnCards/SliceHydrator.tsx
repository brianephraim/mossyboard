import { useEffect } from "react";

import type { ColumnCardsSlice } from "./keys";
import type { ColumnCardItem } from "./useColumnCards";
import { useColumnCards } from "./useColumnCards";

/**
 * Renders nothing. Subscribes to the cards in a single slice via
 * `useColumnCards` and reports the resolved items + load state up to the
 * parent. One instance is mounted per `(columnId, sliceKey)` pair.
 */
export function SliceHydrator({
  slice,
  sliceKey,
  onItemsChange,
}: Readonly<{
  slice: ColumnCardsSlice;
  sliceKey: string;
  onItemsChange: (
    columnId: string,
    sliceKey: string,
    items: ColumnCardItem[],
    flags: { isLoading: boolean; error: unknown },
  ) => void;
}>) {
  const { items, isLoading, error } = useColumnCards(slice);
  useEffect(() => {
    onItemsChange(slice.columnId, sliceKey, items, { isLoading, error });
  }, [slice.columnId, sliceKey, items, isLoading, error, onItemsChange]);
  return null;
}
