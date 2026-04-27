import { useCallback } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

import { trpc } from "../../trpc/client";
import type { CardListItem } from "./types";

type UseTagMutationsInput = {
  boardId: string | null;
  onAnnounce: (message: string) => void;
};

type ListItemTag = CardListItem["tags"][number];
type InfiniteListData = {
  pages: Array<{ items: CardListItem[]; nextCursor: unknown }>;
  pageParams: unknown[];
};

// Patch every cached `card.listByBoard` infinite-query for this boardId without changing
// the row's `updatedAt` — keeps tag add/remove from re-sorting the list view (which is
// ordered by `updatedAt DESC` server-side).
function patchListByBoardCacheForCard(
  queryClient: QueryClient,
  boardId: string,
  cardId: string,
  updateTags: (current: ReadonlyArray<ListItemTag>) => ReadonlyArray<ListItemTag>,
): void {
  const queryKey = getQueryKey(trpc.card.listByBoard);
  queryClient.setQueriesData<InfiniteListData>(
    {
      queryKey,
      predicate: (query) => {
        const second = query.queryKey?.[1] as { input?: { boardId?: string } } | undefined;
        return second?.input?.boardId === boardId;
      },
    },
    (existing) => {
      if (!existing) return existing;
      let dataChanged = false;
      const pages = existing.pages.map((page) => {
        let pageChanged = false;
        const items = page.items.map((item) => {
          if (item.id !== cardId) return item;
          const nextTags = updateTags(item.tags);
          if (nextTags === item.tags) return item;
          pageChanged = true;
          return { ...item, tags: nextTags as CardListItem["tags"] };
        });
        if (!pageChanged) return page;
        dataChanged = true;
        return { ...page, items };
      });
      return dataChanged ? { ...existing, pages } : existing;
    },
  );
}

export function useTagMutations({ boardId, onAnnounce }: UseTagMutationsInput) {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  // Used after mutations that intentionally do not need a list-view refresh
  // (tag mutations patch the list cache directly to avoid re-sorting).
  const refreshTagSurfaces = useCallback(async () => {
    await Promise.all([
      utils.tag.list.invalidate(),
      utils.card.listByColumn.invalidate(),
      boardId ? utils.board.getStructure.invalidate({ boardId }) : Promise.resolve(),
      utils.card.get.invalidate(),
    ]);
  }, [boardId, utils]);

  const addTagMutation = trpc.tag.addToCard.useMutation({
    onSuccess: async (data, variables) => {
      if (boardId) {
        const trimmed = variables.name.trim();
        const newTag: ListItemTag = {
          id: data.tagId,
          name: trimmed,
          normalizedName: trimmed.toLowerCase(),
        };
        patchListByBoardCacheForCard(queryClient, boardId, variables.cardId, (current) => {
          if (current.some((tag) => tag.id === newTag.id)) return current;
          return [...current, newTag];
        });
      }
      await refreshTagSurfaces();
      onAnnounce(`Tag ${variables.name} added.`);
    },
  });

  const detachTagMutation = trpc.tag.detachFromCard.useMutation({
    onSuccess: async (_data, variables) => {
      if (boardId) {
        patchListByBoardCacheForCard(queryClient, boardId, variables.cardId, (current) => {
          if (!current.some((tag) => tag.id === variables.tagId)) return current;
          return current.filter((tag) => tag.id !== variables.tagId);
        });
      }
      await refreshTagSurfaces();
      onAnnounce("Tag removed.");
    },
  });

  const addTag = useCallback(
    async (input: { cardId: string; name: string }) => {
      await addTagMutation.mutateAsync(input);
    },
    [addTagMutation],
  );

  const detachTag = useCallback(
    async (input: { cardId: string; tagId: string }) => {
      await detachTagMutation.mutateAsync(input);
    },
    [detachTagMutation],
  );

  return { addTag, detachTag };
}
