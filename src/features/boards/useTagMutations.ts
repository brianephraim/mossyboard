import { useCallback } from "react";

import { trpc } from "../../trpc/client";

type UseTagMutationsInput = {
  boardId: string | null;
  onAnnounce: (message: string) => void;
};

export function useTagMutations({ boardId, onAnnounce }: UseTagMutationsInput) {
  const utils = trpc.useUtils();

  const invalidate = useCallback(async () => {
    await Promise.all([
      utils.tag.list.invalidate(),
      boardId ? utils.card.listByBoard.invalidate({ boardId }) : Promise.resolve(),
      boardId ? utils.board.getWithColumnsAndCards.invalidate({ boardId }) : Promise.resolve(),
      utils.card.get.invalidate(),
    ]);
  }, [boardId, utils]);

  const addTagMutation = trpc.tag.addToCard.useMutation({
    onSuccess: async (_data, variables) => {
      await invalidate();
      onAnnounce(`Tag ${variables.name} added.`);
    },
  });

  const detachTagMutation = trpc.tag.detachFromCard.useMutation({
    onSuccess: async () => {
      await invalidate();
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
