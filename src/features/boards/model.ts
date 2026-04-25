import type {
  BoardDetailSearch,
  BoardGroupBy,
  BoardLane,
  BoardLaneCard,
  BoardLanePriorityGroup,
  BoardsIndexStatus,
  BoardViewMode,
  CardPriority,
  LoadedBoard,
} from "./types";

const priorityValues = [
  "none",
  "low",
  "medium",
  "high",
] as const satisfies ReadonlyArray<CardPriority>;

export const boardPriorityValues = [...priorityValues];

export const boardPriorityMeta: Record<
  CardPriority,
  {
    label: string;
    shortLabel: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
  }
> = {
  none: {
    label: "No priority",
    shortLabel: "None",
    backgroundColor: "$boardPriorityNoneBg",
    textColor: "$boardPriorityNoneText",
    accentColor: "#a39a92",
  },
  low: {
    label: "Low",
    shortLabel: "Low",
    backgroundColor: "$boardPriorityLowBg",
    textColor: "$boardPriorityLowText",
    accentColor: "#6a9635",
  },
  medium: {
    label: "Medium",
    shortLabel: "Medium",
    backgroundColor: "$boardPriorityMediumBg",
    textColor: "$boardPriorityMediumText",
    accentColor: "#d39a28",
  },
  high: {
    label: "High",
    shortLabel: "High",
    backgroundColor: "$boardPriorityHighBg",
    textColor: "$boardPriorityHighText",
    accentColor: "#db6846",
  },
};

type RawSearch = Record<string, unknown>;

function normalizeSearchString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === "string" && first.length > 0 ? first : undefined;
  }

  return undefined;
}

function isBoardViewMode(value: string | undefined): value is BoardViewMode {
  return value === "board" || value === "list";
}

function isBoardGroupBy(value: string | undefined): value is BoardGroupBy {
  return value === "column" || value === "priority";
}

function isCardPriority(value: string): value is CardPriority {
  return priorityValues.includes(value as CardPriority);
}

export function parseBoardsIndexSearch(search: RawSearch): {
  status?: BoardsIndexStatus;
} {
  const status = normalizeSearchString(search.status);

  if (status === "deleted") {
    return { status };
  }

  return {};
}

export function parseBoardDetailSearch(search: RawSearch): BoardDetailSearch {
  const card = normalizeSearchString(search.card);
  const view = normalizeSearchString(search.view);
  const groupBy = normalizeSearchString(search.groupBy);
  const priority = normalizeSearchString(search.priority);

  return {
    card,
    view: isBoardViewMode(view) ? view : "board",
    groupBy: isBoardGroupBy(groupBy) ? groupBy : "column",
    priority: parsePriorityFilter(priority),
  };
}

function parsePriorityFilter(value: string | undefined): CardPriority[] {
  if (!value) {
    return [];
  }

  const uniqueValues = new Set<CardPriority>();

  for (const entry of value.split(",")) {
    if (isCardPriority(entry)) {
      uniqueValues.add(entry);
    }
  }

  return priorityValues.filter((priorityOption) => uniqueValues.has(priorityOption));
}

export function serializePriorityFilter(priority: CardPriority[]) {
  return priority.length > 0 ? priority.join(",") : undefined;
}

export function togglePrioritySelection(
  selected: CardPriority[],
  priority: CardPriority,
): CardPriority[] {
  const set = new Set(selected);

  if (set.has(priority)) {
    set.delete(priority);
  } else {
    set.add(priority);
  }

  return priorityValues.filter((value) => set.has(value));
}

export function buildBoardLanes(
  board: LoadedBoard,
  input: {
    groupBy: BoardGroupBy;
    priority: CardPriority[];
  },
): BoardLane[] {
  const activePriorityFilters = new Set(input.priority);

  return board.columns.map((column) => ({
    id: column.id,
    title: column.title,
    laneKind: "column" as const,
    originalColumnId: column.id,
    columnVersion: column.version,
    cards: column.cards
      .filter(
        (card) => activePriorityFilters.size === 0 || activePriorityFilters.has(card.priority),
      )
      .map((card) => ({
        ...card,
        originalColumnId: column.id,
        originalColumnTitle: column.title,
      })),
  }));
}

export function reorderBoardColumns(
  board: LoadedBoard,
  sourceIndex: number,
  destinationIndex: number,
): LoadedBoard {
  return {
    ...board,
    columns: reorderArray(board.columns, sourceIndex, destinationIndex),
  };
}

export function reorderBoardCards(
  board: LoadedBoard,
  input: {
    sourceColumnId: string;
    sourceIndex: number;
    destinationColumnId: string;
    destinationIndex: number;
  },
): LoadedBoard {
  const nextColumns = board.columns.map((column) => ({
    ...column,
    cards: [...column.cards],
  }));
  const sourceColumn = nextColumns.find((column) => column.id === input.sourceColumnId);
  const destinationColumn = nextColumns.find((column) => column.id === input.destinationColumnId);

  if (!sourceColumn || !destinationColumn) {
    return board;
  }

  const [movedCard] = sourceColumn.cards.splice(input.sourceIndex, 1);
  if (!movedCard) {
    return board;
  }

  destinationColumn.cards.splice(input.destinationIndex, 0, {
    ...movedCard,
    columnId: destinationColumn.id,
  });

  return {
    ...board,
    columns: nextColumns.map((column) => ({
      ...column,
      cardCount: column.cards.length,
    })),
  };
}

function reorderArray<T>(items: T[], sourceIndex: number, destinationIndex: number) {
  const nextItems = [...items];
  const [removed] = nextItems.splice(sourceIndex, 1);

  if (removed === undefined) {
    return nextItems;
  }

  nextItems.splice(destinationIndex, 0, removed);
  return nextItems;
}

export function getNeighborIds<T extends { id: string }>(
  items: T[],
  targetIndex: number,
): { prevId: string | null; nextId: string | null } {
  return {
    prevId: items[targetIndex - 1]?.id ?? null,
    nextId: items[targetIndex + 1]?.id ?? null,
  };
}

export function canReorderBoard(input: {
  view: BoardViewMode;
  groupBy: BoardGroupBy;
  priority: CardPriority[];
}) {
  return input.view === "board" && input.groupBy === "column" && input.priority.length === 0;
}

export function getCardPosition(board: LoadedBoard, cardId: string) {
  for (let columnIndex = 0; columnIndex < board.columns.length; columnIndex += 1) {
    const column = board.columns[columnIndex];

    for (let cardIndex = 0; cardIndex < column.cards.length; cardIndex += 1) {
      const card = column.cards[cardIndex];

      if (card.id === cardId) {
        return {
          column,
          columnIndex,
          card,
          cardIndex,
        };
      }
    }
  }

  return null;
}

export function getColumnPosition(board: LoadedBoard, columnId: string) {
  const columnIndex = board.columns.findIndex((column) => column.id === columnId);
  if (columnIndex === -1) {
    return null;
  }

  const column = board.columns[columnIndex];
  if (!column) {
    return null;
  }

  return {
    column,
    columnIndex,
  };
}

export function groupListItemsByPriority<T extends BoardLaneCard>(
  cards: T[],
): BoardLanePriorityGroup[] {
  const groups = new Map<CardPriority, T[]>();

  for (const priority of priorityValues) {
    groups.set(priority, []);
  }

  for (const card of cards) {
    const current = groups.get(card.priority);
    if (current) {
      current.push(card);
    }
  }

  return priorityValues.map((priority) => ({
    priority,
    title: boardPriorityMeta[priority].label,
    cards: groups.get(priority) ?? [],
  }));
}
