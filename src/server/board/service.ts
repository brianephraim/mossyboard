import { trpcErrors } from "../trpc/init";
import {
  createBoard,
  getBoardStructure,
  listBoards,
  renameBoard,
  softDeleteBoard,
  type BoardStructureRow,
  type BoardSummaryRow,
} from "./repo";
import { addSampleCardsToBoard } from "../card/repo";

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

export async function getBoardStructureForUser(ownerId: string, input: { boardId: string }) {
  const structure = await getBoardStructure({ ownerId, boardId: input.boardId });
  if (!structure) {
    throw trpcErrors.notFound("Board not found");
  }

  return { board: serializeBoardStructure(structure) };
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

export async function addSampleDataToBoardForUser(
  ownerId: string,
  input: { boardId: string; count: number },
): Promise<{ createdCount: number }> {
  return addSampleCardsToBoard({
    ownerId,
    boardId: input.boardId,
    count: input.count,
  });
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

function serializeBoardStructure(row: BoardStructureRow) {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    columns: row.columns,
  };
}
