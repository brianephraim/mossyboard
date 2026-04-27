import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "../../server/trpc/router";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type BoardSummary = RouterOutputs["board"]["list"]["boards"][number];
export type LoadedBoardStructure = RouterOutputs["board"]["getStructure"]["board"];
export type LoadedBoardStructureColumn = LoadedBoardStructure["columns"][number];

type ListByColumnItem = RouterOutputs["card"]["listByColumn"]["items"][number];

/**
 * Synthetic board shape produced by `synthesizeBoardFromStructure`. It mirrors
 * the legacy `board.getWithColumnsAndCards` response so existing renderers
 * (`BoardCanvas`, `model.ts`, priority grouping helpers) keep working without
 * change.
 */
export type LoadedBoard = {
  id: string;
  name: string;
  updatedAt: string;
  columnCount: number;
  cardCount: number;
  columns: Array<{
    id: string;
    title: string;
    position: string;
    version: number;
    cardCount: number;
    cards: Array<{
      id: string;
      columnId: string;
      title: string;
      description: string;
      priority: ListByColumnItem["priority"];
      position: string;
      version: number;
      tags: ListByColumnItem["tags"];
    }>;
  }>;
};
export type LoadedColumn = LoadedBoard["columns"][number];
export type CardSummary = LoadedColumn["cards"][number];
export type CardDetail = RouterOutputs["card"]["get"]["card"];
export type CardListItem = RouterOutputs["card"]["listByBoard"]["items"][number];

export type CardPriority = CardSummary["priority"];
export type BoardViewMode = "board" | "list";
export type BoardGroupBy = "column" | "priority";
export type BoardsIndexStatus = "deleted";

export type BoardLaneCard = CardSummary & {
  originalColumnId: string;
  originalColumnTitle: string;
};

export type BoardLanePriorityGroup = {
  priority: CardPriority;
  title: string;
  cards: BoardLaneCard[];
};

export type BoardLane = {
  id: string;
  title: string;
  laneKind: "column" | "priority";
  originalColumnId?: string;
  /** Present for real columns; used for optimistic rename + conflict checks. */
  columnVersion?: number;
  helperText?: string;
  cards: BoardLaneCard[];
};

export type BoardDetailSearch = {
  card?: string;
  view: BoardViewMode;
  groupBy: BoardGroupBy;
  priority: CardPriority[];
  tags: string[];
  drawer?: string;
};
