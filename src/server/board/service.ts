import { trpcErrors } from "../trpc/init";
import {
  createBoard,
  getBoardWithColumnsAndCards,
  listBoards,
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
