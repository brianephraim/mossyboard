import { useMemo } from "react";

import { trpc } from "../../../trpc/client";
import type { CardPriority } from "../types";
import type { ColumnCardsSlice } from "./keys";
import { sliceQueryInput } from "./keys";

export type ColumnCardItem = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: CardPriority;
  position: string;
  version: number;
  tags: Array<{ id: string; name: string; normalizedName: string }>;
};

export function useColumnCards(slice: ColumnCardsSlice) {
  const input = sliceQueryInput(slice);
  const query = trpc.card.listByColumn.useInfiniteQuery(input, {
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: false,
  });

  const items = useMemo<ColumnCardItem[]>(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) =>
      page.items.map((item) => ({
        id: item.id,
        columnId: item.columnId,
        title: item.title,
        description: item.description,
        priority: item.priority,
        position: item.position,
        version: item.version,
        tags: item.tags,
      })),
    );
  }, [query.data]);

  return {
    items,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  };
}
