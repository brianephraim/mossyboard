import { trpcErrors } from "../trpc/init";
import {
  createBoard,
  getBoardWithColumnsAndCards,
  listBoards,
  renameBoard,
  softDeleteBoard,
  type BoardSummaryRow,
  type LoadedBoardRow,
} from "./repo";

export async function listBoardsForUser(ownerId: string): Promise<{
  boards: Array<{
    id: string;
    name: string;
    updatedAt: string;
    columnCount: number;
    cardCount: number;
  }>;
}> {
  const rows = await listBoards({ ownerId });
  return {
    boards: rows.map(serializeBoardSummary),
  };
}

export async function createBoardForUser(ownerId: string, input: { name: string }) {
  const created = await createBoard({ ownerId, name: input.name.trim() });
  return { boardId: created.id };
}

export async function getBoardWithColumnsAndCardsForUser(ownerId: string, boardId: string) {
  const loaded = await getBoardWithColumnsAndCards({ ownerId, boardId });
  if (!loaded) {
    throw trpcErrors.notFound("Board not found");
  }

  return { board: serializeLoadedBoard(loaded) };
}

export async function renameBoardForUser(
  ownerId: string,
  input: { boardId: string; name: string },
) {
  const renamed = await renameBoard({
    ownerId,
    boardId: input.boardId,
    name: input.name.trim(),
  });
  if (!renamed) {
    throw trpcErrors.notFound("Board not found");
  }

  return {
    boardId: renamed.id,
    name: renamed.name,
    updatedAt: renamed.updatedAt.toISOString(),
  };
}

export async function softDeleteBoardForUser(ownerId: string, input: { boardId: string }) {
  const deleted = await softDeleteBoard({
    ownerId,
    boardId: input.boardId,
  });
  if (!deleted) {
    throw trpcErrors.notFound("Board not found");
  }

  return {
    boardId: deleted.id,
    deletedAt: deleted.deletedAt.toISOString(),
  };
}

function serializeBoardSummary(row: BoardSummaryRow) {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    columnCount: row.columnCount,
    cardCount: row.cardCount,
  };
}

function serializeLoadedBoard(row: LoadedBoardRow) {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    columnCount: row.columnCount,
    cardCount: row.cardCount,
    columns: row.columns,
  };
}
