import { trpc } from "../../trpc/client";
import type { LoadedBoard } from "./types";

export type BoardPaneStateLike = {
  setOptimisticBoard: (b: LoadedBoard | null) => void;
  setConflictMessage: (m: string | null) => void;
};

export type BoardMutations = {
  refreshBoard: () => Promise<void>;
  handleMutationError: (message: string) => Promise<void>;
  createCard: ReturnType<typeof trpc.card.create.useMutation>;
  createColumn: ReturnType<typeof trpc.column.create.useMutation>;
  renameColumn: ReturnType<typeof trpc.column.rename.useMutation>;
  renameBoard: ReturnType<typeof trpc.board.rename.useMutation>;
  deleteBoard: ReturnType<typeof trpc.board.softDelete.useMutation>;
  reorderColumn: ReturnType<typeof trpc.column.reorder.useMutation>;
  reorderCard: ReturnType<typeof trpc.card.reorder.useMutation>;
  moveCard: ReturnType<typeof trpc.card.move.useMutation>;
};

export function useBoardMutations(input: {
  boardId: string | null;
  boardQuery: ReturnType<typeof trpc.board.getWithColumnsAndCards.useQuery>;
  setAnnouncement: (m: string | null) => void;
  state: BoardPaneStateLike;
}): BoardMutations {
  const utils = trpc.useUtils();
  const boardId = input.boardId;

  const refreshBoard = async () => {
    if (!boardId) {
      return;
    }
    await input.boardQuery.refetch();
    await utils.board.list.invalidate();
    input.state.setOptimisticBoard(null);
  };

  const handleMutationError = async (message: string) => {
    input.state.setOptimisticBoard(null);
    input.state.setConflictMessage(message);
    await input.boardQuery.refetch();
  };

  const createCard = trpc.card.create.useMutation({
    onSuccess: async ({ cardId }) => {
      if (!boardId) {
        return;
      }
      await Promise.all([refreshBoard(), utils.card.listByBoard.invalidate({ boardId })]);
      input.setAnnouncement("Card created.");
      // URL open is handled by caller.
      void cardId;
    },
    onError: async (error) => {
      await handleMutationError(error.message);
    },
  });

  const createColumn = trpc.column.create.useMutation({
    onSuccess: async () => {
      await refreshBoard();
      input.setAnnouncement("Column created.");
    },
    onError: async (error) => {
      await handleMutationError(error.message);
    },
  });

  const renameColumn = trpc.column.rename.useMutation({
    onSuccess: async () => {
      await refreshBoard();
      input.setAnnouncement("Column renamed.");
    },
    onError: async (error) => {
      await handleMutationError(error.message);
    },
  });

  const renameBoard = trpc.board.rename.useMutation({
    onSuccess: async () => {
      await refreshBoard();
      input.setAnnouncement("Board renamed.");
    },
    onError: async (error) => {
      await handleMutationError(error.message);
    },
  });

  const deleteBoard = trpc.board.softDelete.useMutation({
    onSuccess: async () => {
      await utils.board.list.invalidate();
      input.setAnnouncement("Board deleted.");
    },
    onError: async (error) => {
      await handleMutationError(error.message);
    },
  });

  const reorderColumn = trpc.column.reorder.useMutation({
    onSuccess: async () => {
      await refreshBoard();
      input.setAnnouncement("Column moved.");
    },
    onError: async () => {
      await handleMutationError(
        "We couldn’t move that column because the board changed. Refresh and try again.",
      );
    },
  });

  const reorderCard = trpc.card.reorder.useMutation({
    onSuccess: async () => {
      if (!boardId) {
        return;
      }
      await Promise.all([refreshBoard(), utils.card.listByBoard.invalidate({ boardId })]);
      input.setAnnouncement("Card moved.");
    },
    onError: async () => {
      await handleMutationError(
        "We couldn’t move that card because the board changed. Refresh and try again.",
      );
    },
  });

  const moveCard = trpc.card.move.useMutation({
    onSuccess: async () => {
      if (!boardId) {
        return;
      }
      await Promise.all([refreshBoard(), utils.card.listByBoard.invalidate({ boardId })]);
      input.setAnnouncement("Card moved.");
    },
    onError: async () => {
      await handleMutationError(
        "We couldn’t move that card because the board changed. Refresh and try again.",
      );
    },
  });

  return {
    refreshBoard,
    handleMutationError,
    createCard,
    createColumn,
    renameColumn,
    renameBoard,
    deleteBoard,
    reorderColumn,
    reorderCard,
    moveCard,
  };
}
