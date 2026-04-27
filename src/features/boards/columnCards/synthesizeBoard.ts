import type { LoadedBoard, LoadedBoardStructure } from "../types";
import type { ColumnCardItem } from "./useColumnCards";

export type ColumnCardsByColumn = Record<string, ColumnCardItem[]>;

/**
 * Build a `LoadedBoard`-shaped synthetic snapshot from a board structure plus
 * the per-column cards loaded by slice queries. The result is what the rest of
 * the UI (BoardCanvas, model.ts helpers, mutation reorder math) consumes.
 */
export function synthesizeBoardFromStructure(
  structure: LoadedBoardStructure,
  cardsByColumn: ColumnCardsByColumn,
): LoadedBoard {
  const columns = structure.columns.map((column) => {
    const cards = (cardsByColumn[column.id] ?? []).slice();
    cards.sort(compareByPosition);
    return {
      id: column.id,
      title: column.title,
      position: column.position,
      version: column.version,
      cardCount: cards.length,
      cards: cards.map(toCard),
    };
  });
  const cardCount = columns.reduce((sum, col) => sum + col.cards.length, 0);
  return {
    id: structure.id,
    name: structure.name,
    updatedAt: structure.updatedAt,
    columnCount: columns.length,
    cardCount,
    columns,
  };
}

function toCard(card: ColumnCardItem): LoadedBoard["columns"][number]["cards"][number] {
  return {
    id: card.id,
    columnId: card.columnId,
    title: card.title,
    description: card.description,
    priority: card.priority,
    position: card.position,
    version: card.version,
    tags: card.tags,
  };
}

function compareByPosition(a: ColumnCardItem, b: ColumnCardItem): number {
  if (a.position === b.position) {
    return a.id < b.id ? -1 : 1;
  }
  return a.position < b.position ? -1 : 1;
}
