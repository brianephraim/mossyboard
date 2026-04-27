import type { DropResult, Sensor, SensorAPI } from "@hello-pangea/dnd";
import type { RefObject } from "react";
import { useCallback, useMemo, useRef } from "react";
import { YStack } from "@tamagui/stacks";

import { BoardInlineNotice } from "../ui";
import { buildBoardLanes } from "../model";
import type { BoardDetailSearch, CardPriority, LoadedBoard } from "../types";
import type { BoardKey } from "../useDualBoardDnd";
import { scopeId } from "../useDualBoardDnd";
import { BoardColumnsLayout } from "./BoardColumnsLayout";
import { BoardLaneView } from "./BoardLaneView";
import type { CardTagsRowTag } from "./CardTagsRow";

type Direction = "up" | "down" | "left" | "right";

type BoardCanvasProps = {
  board: LoadedBoard;
  search: BoardDetailSearch;
  canReorder: boolean;
  groupedBoardReorderEnabled: boolean;
  onToggleGroupedBoardReorderEnabled: (enabled: boolean) => void;
  onDragEnd: (result: DropResult) => void;
  onOpenCard: (cardId: string) => void;
  onDeleteCard: (input: { cardId: string; expectedVersion: number }) => Promise<void>;
  onOpenCreateCard: (columnId: string) => void;
  onRenameCardTitle: (input: {
    cardId: string;
    title: string;
    description: string;
    priority: CardPriority;
    expectedVersion: number;
  }) => Promise<void>;
  onRenameColumn: (input: {
    columnId: string;
    title: string;
    expectedVersion: number;
  }) => Promise<void>;
  renamePendingColumnId: string | null;
  onOpenCreateColumnAfter: (columnId?: string | null) => void;
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  onMoveCard: (cardId: string, direction: Direction) => void;
  onMovePriorityGroupCard: (
    cardId: string,
    priority: CardPriority,
    direction: "up" | "down",
  ) => void;
  programmaticSensorApiRef?: RefObject<SensorAPI | null>;
  dndScopeKey?: BoardKey;
  bottomScrollPadding?: number;
  wrapDragDropContext?: boolean;
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onAddTag: (input: { cardId: string; name: string }) => Promise<void>;
  onDetachTag: (input: { cardId: string; tagId: string }) => Promise<void>;
  paginationByColumn?: Readonly<
    Record<string, { hasNextPage: boolean; onLoadMore: () => void } | undefined>
  >;
};

export function BoardCanvas({
  board,
  search,
  canReorder,
  groupedBoardReorderEnabled,
  onToggleGroupedBoardReorderEnabled: _onToggleGroupedBoardReorderEnabled,
  onDragEnd,
  onOpenCard,
  onDeleteCard,
  onOpenCreateCard,
  onRenameCardTitle,
  onRenameColumn,
  renamePendingColumnId,
  onOpenCreateColumnAfter,
  onMoveColumn,
  onMoveCard,
  onMovePriorityGroupCard,
  programmaticSensorApiRef,
  dndScopeKey,
  bottomScrollPadding,
  wrapDragDropContext = true,
  availableTags,
  onAddTag,
  onDetachTag,
  paginationByColumn,
}: Readonly<BoardCanvasProps>) {
  const lanes = useMemo(() => {
    return buildBoardLanes(board, {
      groupBy: search.groupBy,
      priority: search.priority,
      tags: search.tags,
    });
  }, [board, search.groupBy, search.priority, search.tags]);
  const hasActivePriorityFilters = search.priority.length > 0;
  const isPriorityGroupedBoard = search.view === "board" && search.groupBy === "priority";
  const isPriorityFilteredColumnBoard =
    search.view === "board" && search.groupBy === "column" && hasActivePriorityFilters;
  const showGroupedBoardReorderNotice = isPriorityGroupedBoard || isPriorityFilteredColumnBoard;
  const priorityGroupReorderEnabled = isPriorityGroupedBoard && groupedBoardReorderEnabled;
  const filteredColumnReorderEnabled = isPriorityFilteredColumnBoard && groupedBoardReorderEnabled;

  const enableColumnDnD = canReorder || priorityGroupReorderEnabled;
  const enableCardReorder = canReorder || filteredColumnReorderEnabled;
  const needsDragContext = enableColumnDnD || enableCardReorder;

  const sensorApiRef = useRef<SensorAPI | null>(null);
  const programmaticSensor: Sensor = useMemo(() => {
    return (api) => {
      sensorApiRef.current = api;
    };
  }, []);
  const scoped = useCallback(
    (id: string) => (dndScopeKey ? scopeId(dndScopeKey, id) : id),
    [dndScopeKey],
  );
  const api = programmaticSensorApiRef?.current ?? sensorApiRef.current;

  const noticeMessage = computeNoticeMessage({
    isPriorityGroupedBoard,
    isPriorityFilteredColumnBoard,
    groupedBoardReorderEnabled,
    priorityGroupReorderEnabled,
    filteredColumnReorderEnabled,
    canReorder,
    isBoardView: search.view === "board",
  });

  const moveColumnProgrammatically = useCallback(
    (columnId: string, direction: "left" | "right") => {
      if (!enableColumnDnD) {
        onMoveColumn(columnId, direction);
        return;
      }
      runProgrammaticDrag(api, scoped(columnId), direction, () =>
        onMoveColumn(columnId, direction),
      );
    },
    [api, enableColumnDnD, onMoveColumn, scoped],
  );

  const moveCardProgrammatically = useCallback(
    (cardId: string, direction: Direction) => {
      if (!enableCardReorder) {
        onMoveCard(cardId, direction);
        return;
      }
      runProgrammaticDrag(api, scoped(cardId), direction, () => onMoveCard(cardId, direction));
    },
    [api, enableCardReorder, onMoveCard, scoped],
  );

  const renderLane: Parameters<typeof BoardColumnsLayout>[0]["renderLane"] = useCallback(
    (lane, _laneIndex, dragHandleProps) => {
      const columnId = lane.laneKind === "column" ? lane.originalColumnId : null;
      const pagination = columnId ? paginationByColumn?.[columnId] : undefined;
      return (
        <BoardLaneView
          lane={lane}
          canReorder={enableCardReorder}
          groupBy={search.groupBy}
          hasActivePriorityFilters={hasActivePriorityFilters}
          canMoveColumn={enableColumnDnD}
          groupedBoardReorderEnabled={groupedBoardReorderEnabled}
          dragHandleProps={dragHandleProps}
          availableTags={availableTags}
          onOpenCard={onOpenCard}
          onDeleteCard={onDeleteCard}
          onOpenCreateCard={onOpenCreateCard}
          onAddTag={onAddTag}
          onDetachTag={onDetachTag}
          onRenameCardTitle={onRenameCardTitle}
          onRenameColumn={onRenameColumn}
          renamePendingColumnId={renamePendingColumnId}
          onOpenCreateColumnAfter={onOpenCreateColumnAfter}
          onMoveColumn={enableColumnDnD ? moveColumnProgrammatically : onMoveColumn}
          onMoveCard={enableCardReorder ? moveCardProgrammatically : onMoveCard}
          onMovePriorityGroupCard={onMovePriorityGroupCard}
          dndScopeKey={dndScopeKey}
          bottomScrollPadding={bottomScrollPadding}
          hasNextPage={pagination?.hasNextPage ?? false}
          onLoadMore={pagination?.onLoadMore}
        />
      );
    },
    [
      availableTags,
      bottomScrollPadding,
      dndScopeKey,
      enableCardReorder,
      enableColumnDnD,
      groupedBoardReorderEnabled,
      hasActivePriorityFilters,
      moveCardProgrammatically,
      moveColumnProgrammatically,
      onAddTag,
      onDeleteCard,
      onDetachTag,
      onMoveCard,
      onMoveColumn,
      onMovePriorityGroupCard,
      onOpenCard,
      onOpenCreateCard,
      onOpenCreateColumnAfter,
      onRenameCardTitle,
      onRenameColumn,
      paginationByColumn,
      renamePendingColumnId,
      search.groupBy,
    ],
  );

  // keep legacy signatures below (used by callers/tests)
  const _moveColumnProgrammatically = moveColumnProgrammatically;
  const _moveCardProgrammatically = moveCardProgrammatically;

  // Backward-compatible aliasing for the below usage sites.
  const moveColumnProgrammaticallyAlias = _moveColumnProgrammatically;
  const moveCardProgrammaticallyAlias = _moveCardProgrammatically;

  // NOTE: renderLane is now stable via useCallback.

  void moveColumnProgrammaticallyAlias;
  void moveCardProgrammaticallyAlias;

  // (Old inline functions removed below.)

  /*
   * Previous implementation had inline move/programmatic + inline renderLane,
   * which caused unnecessary prop churn for large boards.
   */

  // --- removed code below ---
  /*
  const moveColumnProgrammatically = (columnId: string, direction: "left" | "right") => {
    if (!enableColumnDnD) {
      onMoveColumn(columnId, direction);
      return;
    }
    runProgrammaticDrag(api, scoped(columnId), direction, () => onMoveColumn(columnId, direction));
  };

  const moveCardProgrammatically = (cardId: string, direction: Direction) => {
    if (!enableCardReorder) {
      onMoveCard(cardId, direction);
      return;
    }
    runProgrammaticDrag(api, scoped(cardId), direction, () => onMoveCard(cardId, direction));
  };

  */

  return (
    <YStack gap="$4" flex={1} minHeight={0} overflow="hidden">
      {noticeMessage ? (
        <YStack paddingHorizontal="$5">
          <BoardInlineNotice
            tone={
              showGroupedBoardReorderNotice && groupedBoardReorderEnabled ? "success" : "warning"
            }
            message={noticeMessage}
          />
        </YStack>
      ) : null}

      <div
        style={{
          display: "flex",
          overflowX: "auto",
          overflowY: "hidden",
          maxWidth: "100%",
          width: "100%",
          flex: "1 1 auto",
          minHeight: 0,
        }}
      >
        <BoardColumnsLayout
          lanes={lanes}
          enableColumnDnD={enableColumnDnD}
          dragSensors={needsDragContext ? [programmaticSensor] : undefined}
          onDragEnd={onDragEnd}
          onOpenCreateColumnAfter={onOpenCreateColumnAfter}
          renderLane={renderLane}
          dndScopeKey={dndScopeKey}
          wrapDragDropContext={wrapDragDropContext}
        />
      </div>
    </YStack>
  );
}

function computeNoticeMessage({
  isPriorityGroupedBoard,
  isPriorityFilteredColumnBoard,
  groupedBoardReorderEnabled,
  priorityGroupReorderEnabled,
  filteredColumnReorderEnabled,
  canReorder,
  isBoardView,
}: {
  isPriorityGroupedBoard: boolean;
  isPriorityFilteredColumnBoard: boolean;
  groupedBoardReorderEnabled: boolean;
  priorityGroupReorderEnabled: boolean;
  filteredColumnReorderEnabled: boolean;
  canReorder: boolean;
  isBoardView: boolean;
}): string | null {
  const showGroupedBoardReorderNotice = isPriorityGroupedBoard || isPriorityFilteredColumnBoard;

  if (showGroupedBoardReorderNotice && !groupedBoardReorderEnabled) {
    return isPriorityGroupedBoard
      ? "Priority grouping is display-only for now. Cards stay in their saved column order underneath, so drag and keyboard reorder are off in this view."
      : "Priority-filtered columns are display-only by default. Visible cards keep their saved user order underneath, so drag and keyboard reorder are off in this filtered view.";
  }

  if (priorityGroupReorderEnabled) {
    return "Priority-group reordering is on. Moving cards here updates the saved user order, and dropping into another priority group also updates its priority.";
  }

  if (filteredColumnReorderEnabled) {
    return "Priority-filtered reordering is on. Moving visible cards here updates the saved user order while hidden cards keep their places underneath.";
  }

  if (!canReorder && isBoardView) {
    return "Drag and keyboard reorder controls are available only in board view grouped by column with no active priority filters.";
  }

  return null;
}

function runProgrammaticDrag(
  api: SensorAPI | null,
  draggableId: string,
  direction: Direction,
  fallback: () => void,
) {
  if (!api) {
    fallback();
    return;
  }

  // For cross-axis moves, ensure the destination column is at least partially
  // in the viewport. Hello-pangea's getBestCrossAxisDroppable filters
  // candidate droppables through isPartiallyVisibleThroughFrame(viewport.frame)
  // and silently no-ops the move if every candidate is scrolled off-screen.
  if (direction === "left" || direction === "right") {
    scrollAdjacentColumnIntoView(draggableId, direction);
  }

  const preDrag = api.tryGetLock(draggableId);
  if (!preDrag) {
    return;
  }

  const drag = preDrag.snapLift();
  if (direction === "up") {
    drag.moveUp();
  } else if (direction === "down") {
    drag.moveDown();
  } else if (direction === "left") {
    drag.moveLeft();
  } else if (direction === "right") {
    drag.moveRight();
  }

  // Give the browser a chance to paint the lifted + moved state before dropping.
  // Otherwise the drag can complete within a single frame and look like "nothing happened".
  window.setTimeout(() => {
    drag.drop({ shouldBlockNextClick: true });
  }, 120);
}

// Scroll the column adjacent to the source draggable's column into view, in
// the cross-axis direction of an upcoming programmatic move. The source can
// be either a column draggable (for column reorders) or a card draggable
// nested inside a column. We locate the column-level draggables as direct
// children of the COLUMN-typed Droppable container, then scroll the next or
// previous sibling so it becomes a valid cross-axis candidate.
function scrollAdjacentColumnIntoView(scopedDraggableId: string, direction: "left" | "right") {
  if (typeof document === "undefined") {
    return;
  }

  const cssEscape =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape
      : (value: string) => value.replace(/"/g, '\\"');

  const sourceEl = document.querySelector(
    `[data-rfd-draggable-id="${cssEscape(scopedDraggableId)}"]`,
  );
  if (!(sourceEl instanceof HTMLElement)) {
    return;
  }

  // The columns Droppable's droppableId always ends with "board-columns"
  // (it may be scope-prefixed like "main::board-columns" or "drawer::board-columns").
  // Hello-pangea only emits data-rfd-droppable-id (no type attribute), so we
  // match by id suffix.
  const columnsContainer = sourceEl.closest('[data-rfd-droppable-id$="board-columns"]');
  if (!(columnsContainer instanceof HTMLElement)) {
    return;
  }

  const columns = Array.from(columnsContainer.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && el.hasAttribute("data-rfd-draggable-id"),
  );

  const sourceIndex = columns.findIndex((col) => col === sourceEl || col.contains(sourceEl));
  if (sourceIndex < 0) {
    return;
  }

  const target = columns[direction === "right" ? sourceIndex + 1 : sourceIndex - 1];
  if (!target) {
    return;
  }

  target.scrollIntoView({ block: "nearest", inline: "nearest" });
}
