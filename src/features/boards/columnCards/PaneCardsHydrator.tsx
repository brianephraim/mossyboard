import { useMemo } from "react";

import type { BoardDetailSearch, LoadedBoardStructure } from "../types";
import { describeColumnSlice } from "./keys";
import { sliceCacheKey } from "./sliceCacheKey";
import { SliceHydrator } from "./SliceHydrator";
import type { ColumnCardItem } from "./useColumnCards";

/**
 * Mounts one `SliceHydrator` per (column, slice) for the given pane. Each
 * hydrator emits its loaded items via the supplied callback so the parent can
 * aggregate across slices when synthesizing a board snapshot.
 */
export function PaneCardsHydrator({
  structure,
  search,
  onSliceItemsChange,
}: Readonly<{
  structure: LoadedBoardStructure;
  search: BoardDetailSearch;
  onSliceItemsChange: (
    columnId: string,
    sliceKey: string,
    items: ColumnCardItem[],
    flags: { isLoading: boolean; error: unknown },
  ) => void;
}>) {
  const flatSlices = useMemo(
    () =>
      structure.columns.flatMap((column) =>
        describeColumnSlice(column.id, search).map((slice) => ({
          slice,
          key: sliceCacheKey(slice),
        })),
      ),
    [structure, search],
  );
  return (
    <>
      {flatSlices.map(({ slice, key }) => (
        <SliceHydrator key={key} slice={slice} sliceKey={key} onItemsChange={onSliceItemsChange} />
      ))}
    </>
  );
}
