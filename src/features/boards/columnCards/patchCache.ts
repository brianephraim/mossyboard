import type { QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import { trpc } from "../../../trpc/client";
import type { ColumnCardsSlice } from "./keys";
import { sliceQueryInput } from "./keys";
import type { ColumnCardItem } from "./useColumnCards";

export type CardMutation =
  | { type: "remove"; cardId: string }
  | { type: "insert"; card: ColumnCardItem }
  | {
      type: "update";
      cardId: string;
      patch: Partial<
        Pick<
          ColumnCardItem,
          "position" | "priority" | "version" | "title" | "description" | "columnId"
        >
      >;
    };

export function applyMutation(cards: ColumnCardItem[], mutation: CardMutation): ColumnCardItem[] {
  if (mutation.type === "remove") {
    const next = cards.filter((c) => c.id !== mutation.cardId);
    return next.length === cards.length ? cards : next;
  }
  if (mutation.type === "insert") {
    const merged = [...cards.filter((c) => c.id !== mutation.card.id), mutation.card];
    return sortByPosition(merged);
  }
  const idx = cards.findIndex((c) => c.id === mutation.cardId);
  if (idx === -1) return cards;
  const next = cards.slice();
  next[idx] = { ...next[idx]!, ...mutation.patch };
  return sortByPosition(next);
}

function sortByPosition(cards: ColumnCardItem[]): ColumnCardItem[] {
  return cards.slice().sort((a, b) => {
    if (a.position === b.position) return a.id < b.id ? -1 : 1;
    return a.position < b.position ? -1 : 1;
  });
}

type ListByColumnPage = {
  items: ColumnCardItem[];
  nextCursor: { position: string; cardId: string } | null;
};

type InfiniteData = {
  pages: ListByColumnPage[];
  pageParams: Array<unknown>;
};

export function patchSliceCache(
  queryClient: QueryClient,
  slice: ColumnCardsSlice,
  mutation: CardMutation,
): void {
  const input = sliceQueryInput(slice);
  const queryKey = getQueryKey(trpc.card.listByColumn, input, "infinite");
  queryClient.setQueryData<InfiniteData>(queryKey, (existing) => {
    if (!existing) return existing;
    const nextPages = existing.pages.map((page) => ({
      ...page,
      items: applyMutation(page.items, mutation),
    }));
    return { ...existing, pages: nextPages };
  });
}
