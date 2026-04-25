import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "../../server/trpc/router";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type BoardSummary = RouterOutputs["board"]["list"]["boards"][number];
export type LoadedBoard = RouterOutputs["board"]["getWithColumnsAndCards"]["board"];
export type LoadedColumn = LoadedBoard["columns"][number];
export type CardSummary = LoadedColumn["cards"][number];
export type CardDetail = RouterOutputs["card"]["get"]["card"];
export type CardListItem = RouterOutputs["card"]["listByBoard"]["items"][number];
export type SubtaskSummary = CardDetail["subtasks"][number];

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
  drawer?: string;
};
