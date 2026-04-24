import type { DropResult } from "@hello-pangea/dnd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Stack, Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { BoardActionButton, BoardInlineNotice, BoardPill, BoardSurface, PriorityPill } from "./ui";
import { buildBoardLanes } from "./model";
import type { BoardDetailSearch, BoardLane, LoadedBoard } from "./types";

type BoardCanvasProps = {
  board: LoadedBoard;
  search: BoardDetailSearch;
  canReorder: boolean;
  onDragEnd: (result: DropResult) => void;
  onOpenCard: (cardId: string) => void;
  onOpenCreateCard: (columnId: string) => void;
  onOpenRenameColumn: (columnId: string) => void;
  onOpenCreateColumnAfter: (columnId?: string | null) => void;
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  onMoveCard: (cardId: string, direction: "up" | "down" | "left" | "right") => void;
};

export function BoardCanvas({
  board,
  search,
  canReorder,
  onDragEnd,
  onOpenCard,
  onOpenCreateCard,
  onOpenRenameColumn,
  onOpenCreateColumnAfter,
  onMoveColumn,
  onMoveCard,
}: Readonly<BoardCanvasProps>) {
  const lanes = buildBoardLanes(board, {
    groupBy: search.groupBy,
    priority: search.priority,
  });
  const showColumnManagement = search.groupBy === "column";
  const lastColumnId = board.columns[board.columns.length - 1]?.id ?? null;

  return (
    <YStack gap="$4">
      {!canReorder && search.view === "board" ? (
        <BoardInlineNotice
          tone="warning"
          message="Drag and keyboard reorder controls are available only in board view grouped by column with no active priority filters."
        />
      ) : null}

      <YStack overflow="scroll" maxWidth="100%">
        {canReorder ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
              {(provided) => (
                <XStack
                  ref={provided.innerRef}
                  gap="$4"
                  alignItems="flex-start"
                  minWidth="max-content"
                  {...provided.droppableProps}
                >
                  {board.columns.map((column, columnIndex) => (
                    <Draggable key={column.id} draggableId={column.id} index={columnIndex}>
                      {(columnProvided) => (
                        <YStack
                          ref={columnProvided.innerRef}
                          width={320}
                          minWidth={320}
                          gap="$3"
                          {...columnProvided.draggableProps}
                        >
                          <BoardLaneView
                            lane={{
                              id: column.id,
                              title: column.title,
                              laneKind: "column",
                              originalColumnId: column.id,
                              cards: column.cards.map((card) => ({
                                ...card,
                                originalColumnId: column.id,
                                originalColumnTitle: column.title,
                              })),
                            }}
                            canReorder={canReorder}
                            dragHandleProps={columnProvided.dragHandleProps}
                            onOpenCard={onOpenCard}
                            onOpenCreateCard={onOpenCreateCard}
                            onOpenRenameColumn={onOpenRenameColumn}
                            onMoveColumn={onMoveColumn}
                            onMoveCard={onMoveCard}
                          />
                        </YStack>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  <AddColumnLane onOpen={() => onOpenCreateColumnAfter(lastColumnId)} />
                </XStack>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <XStack gap="$4" alignItems="flex-start" minWidth="max-content">
            {lanes.map((lane) => (
              <YStack key={lane.id} width={320} minWidth={320}>
                <BoardLaneView
                  lane={lane}
                  canReorder={false}
                  onOpenCard={onOpenCard}
                  onOpenCreateCard={onOpenCreateCard}
                  onOpenRenameColumn={onOpenRenameColumn}
                  onOpenCreateColumnAfter={onOpenCreateColumnAfter}
                  onMoveColumn={onMoveColumn}
                  onMoveCard={onMoveCard}
                />
              </YStack>
            ))}
            {showColumnManagement ? (
              <AddColumnLane onOpen={() => onOpenCreateColumnAfter(lastColumnId)} />
            ) : null}
          </XStack>
        )}
      </YStack>
    </YStack>
  );
}

function BoardLaneView({
  lane,
  canReorder,
  dragHandleProps,
  onOpenCard,
  onOpenCreateCard,
  onOpenRenameColumn,
  onOpenCreateColumnAfter,
  onMoveColumn,
  onMoveCard,
}: Readonly<{
  lane: BoardLane;
  canReorder: boolean;
  dragHandleProps?: Record<string, unknown>;
  onOpenCard: (cardId: string) => void;
  onOpenCreateCard: (columnId: string) => void;
  onOpenRenameColumn: (columnId: string) => void;
  onOpenCreateColumnAfter: (columnId?: string | null) => void;
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  onMoveCard: (cardId: string, direction: "up" | "down" | "left" | "right") => void;
}>) {
  const isRealColumn = lane.laneKind === "column" && lane.originalColumnId;

  return (
    <BoardSurface padding="$4">
      <YStack gap="$3">
        <YStack gap="$2">
          <XStack alignItems="center" justifyContent="space-between" gap="$3" {...dragHandleProps}>
            <XStack alignItems="center" gap="$3" minWidth={0}>
              <Stack
                width={12}
                height={12}
                borderRadius={9999}
                backgroundColor={lane.laneKind === "priority" ? "$boardAccent" : "$boardTextSubtle"}
              />
              <Text fontWeight="800" color="$boardHeading" fontSize="$6" numberOfLines={1}>
                {lane.title}
              </Text>
              <BoardPill>{lane.cards.length}</BoardPill>
            </XStack>
            {isRealColumn ? (
              <XStack gap="$2" flexWrap="wrap">
                <BoardActionButton tone="ghost" onPress={() => onMoveColumn(isRealColumn, "left")}>
                  ←
                </BoardActionButton>
                <BoardActionButton tone="ghost" onPress={() => onMoveColumn(isRealColumn, "right")}>
                  →
                </BoardActionButton>
                <BoardActionButton tone="ghost" onPress={() => onOpenRenameColumn(isRealColumn)}>
                  Rename
                </BoardActionButton>
                <BoardActionButton
                  tone="ghost"
                  onPress={() => onOpenCreateColumnAfter(isRealColumn)}
                >
                  Add after
                </BoardActionButton>
              </XStack>
            ) : null}
          </XStack>
          {lane.helperText ? <Text color="$boardTextMuted">{lane.helperText}</Text> : null}
        </YStack>

        {canReorder && isRealColumn ? (
          <Droppable droppableId={isRealColumn} type="CARD">
            {(provided) => (
              <YStack ref={provided.innerRef} gap="$3" minHeight={120} {...provided.droppableProps}>
                {lane.cards.map((card, index) => (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(cardProvided) => (
                      <YStack
                        ref={cardProvided.innerRef}
                        {...cardProvided.draggableProps}
                        {...cardProvided.dragHandleProps}
                      >
                        <CardPreview
                          card={card}
                          showColumnContext={lane.laneKind === "priority"}
                          canMove
                          onOpen={() => onOpenCard(card.id)}
                          onMove={onMoveCard}
                        />
                      </YStack>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <LaneEmptyState
                  isVisible={lane.cards.length === 0}
                  isRealColumn={Boolean(isRealColumn)}
                  onOpenCreateCard={() => {
                    if (isRealColumn) {
                      onOpenCreateCard(isRealColumn);
                    }
                  }}
                />
              </YStack>
            )}
          </Droppable>
        ) : (
          <YStack gap="$3" minHeight={120}>
            {lane.cards.map((card) => (
              <CardPreview
                key={card.id}
                card={card}
                showColumnContext={lane.laneKind === "priority"}
                canMove={false}
                onOpen={() => onOpenCard(card.id)}
                onMove={onMoveCard}
              />
            ))}
            <LaneEmptyState
              isVisible={lane.cards.length === 0}
              isRealColumn={Boolean(isRealColumn)}
              onOpenCreateCard={() => {
                if (isRealColumn) {
                  onOpenCreateCard(isRealColumn);
                }
              }}
            />
          </YStack>
        )}

        {isRealColumn ? (
          <BoardActionButton tone="ghost" onPress={() => onOpenCreateCard(isRealColumn)}>
            + Add card
          </BoardActionButton>
        ) : null}
      </YStack>
    </BoardSurface>
  );
}

function CardPreview({
  card,
  showColumnContext,
  canMove,
  onOpen,
  onMove,
}: Readonly<{
  card: BoardLane["cards"][number];
  showColumnContext: boolean;
  canMove: boolean;
  onOpen: () => void;
  onMove: (cardId: string, direction: "up" | "down" | "left" | "right") => void;
}>) {
  return (
    <BoardSurface padding="$4">
      <YStack gap="$3">
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
            <Text tag="h3" fontWeight="700" color="$boardHeading" flex={1}>
              {card.title}
            </Text>
            <PriorityPill priority={card.priority} />
          </XStack>
          {card.description ? (
            <Text color="$boardTextMuted" numberOfLines={3}>
              {card.description}
            </Text>
          ) : (
            <Text color="$boardTextSubtle">No description yet.</Text>
          )}
        </YStack>

        <XStack gap="$2" flexWrap="wrap" alignItems="center">
          <BoardActionButton tone="ghost" onPress={onOpen}>
            Open
          </BoardActionButton>
          {canMove ? (
            <>
              <BoardActionButton tone="ghost" onPress={() => onMove(card.id, "up")}>
                ↑
              </BoardActionButton>
              <BoardActionButton tone="ghost" onPress={() => onMove(card.id, "down")}>
                ↓
              </BoardActionButton>
              <BoardActionButton tone="ghost" onPress={() => onMove(card.id, "left")}>
                ←
              </BoardActionButton>
              <BoardActionButton tone="ghost" onPress={() => onMove(card.id, "right")}>
                →
              </BoardActionButton>
            </>
          ) : null}
          {showColumnContext ? <BoardPill>{card.originalColumnTitle}</BoardPill> : null}
        </XStack>
      </YStack>
    </BoardSurface>
  );
}

function LaneEmptyState({
  isVisible,
  isRealColumn,
  onOpenCreateCard,
}: Readonly<{
  isVisible: boolean;
  isRealColumn: boolean;
  onOpenCreateCard: () => void;
}>) {
  if (!isVisible) {
    return null;
  }

  return (
    <BoardSurface padding="$4">
      <YStack gap="$3" alignItems="flex-start">
        <Text color="$boardTextMuted">
          {isRealColumn
            ? "This column is empty. Add a card to get it moving."
            : "No cards match this group right now."}
        </Text>
        {isRealColumn ? (
          <BoardActionButton tone="ghost" onPress={onOpenCreateCard}>
            Add card
          </BoardActionButton>
        ) : null}
      </YStack>
    </BoardSurface>
  );
}

function AddColumnLane({ onOpen }: Readonly<{ onOpen: () => void }>) {
  return (
    <YStack width={280} minWidth={280}>
      <BoardSurface padding="$4">
        <YStack gap="$3">
          <Text fontWeight="700" color="$boardHeading">
            Add another column
          </Text>
          <Text color="$boardTextMuted">
            Extend the workflow with a new lane without leaving the board canvas.
          </Text>
          <BoardActionButton tone="accent" onPress={onOpen}>
            + Add column
          </BoardActionButton>
        </YStack>
      </BoardSurface>
    </YStack>
  );
}
