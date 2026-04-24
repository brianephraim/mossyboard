import type { DropResult } from "@hello-pangea/dnd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Input } from "@tamagui/input";
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
  onRenameColumn: (input: {
    columnId: string;
    title: string;
    expectedVersion: number;
  }) => Promise<void>;
  renamePendingColumnId: string | null;
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
  onRenameColumn,
  renamePendingColumnId,
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
                              columnVersion: column.version,
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
                            onRenameColumn={onRenameColumn}
                            renamePendingColumnId={renamePendingColumnId}
                            onOpenCreateColumnAfter={onOpenCreateColumnAfter}
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
                  onRenameColumn={onRenameColumn}
                  renamePendingColumnId={renamePendingColumnId}
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

function ColumnHeaderWithInlineRename({
  lane,
  columnId,
  dragHandleProps,
  onMoveColumn,
  onOpenCreateColumnAfter,
  onRenameColumn,
  renamePendingColumnId,
}: Readonly<{
  lane: BoardLane;
  columnId: string;
  dragHandleProps?: Record<string, unknown>;
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  onOpenCreateColumnAfter: (columnId?: string | null) => void;
  onRenameColumn: (input: {
    columnId: string;
    title: string;
    expectedVersion: number;
  }) => Promise<void>;
  renamePendingColumnId: string | null;
}>) {
  const version = lane.columnVersion ?? 0;
  const labelId = `column-title-${columnId}`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lane.title);
  const skipBlurSave = useRef(false);

  useEffect(() => {
    setDraft(lane.title);
  }, [lane.title]);

  const saving = renamePendingColumnId === columnId;
  const blockActions = Boolean(renamePendingColumnId);

  const cancel = () => {
    skipBlurSave.current = true;
    setDraft(lane.title);
    setEditing(false);
    window.setTimeout(() => {
      skipBlurSave.current = false;
    }, 0);
  };

  const commit = async () => {
    const next = draft.trim();
    if (!next) {
      return;
    }

    if (next === lane.title) {
      cancel();
      return;
    }

    try {
      await onRenameColumn({
        columnId,
        title: next,
        expectedVersion: version,
      });
      setEditing(false);
    } catch {
      /* BoardDetailScreen surfaces conflicts via board refetch. */
    }
  };

  return (
    <YStack gap="$2">
      <XStack alignItems="flex-start" justifyContent="space-between" gap="$3" {...dragHandleProps}>
        <XStack alignItems="center" gap="$3" minWidth={0} flex={1}>
          <Stack
            width={12}
            height={12}
            marginTop={4}
            borderRadius={9999}
            backgroundColor="$boardTextSubtle"
          />
          {editing ? (
            <YStack gap="$2" flex={1} minWidth={0}>
              <YStack tag="label" gap="$2" htmlFor={`${labelId}-field`}>
                <Text id={labelId} fontWeight="600" color="$boardHeading">
                  Column title
                </Text>
                <Input
                  id={`${labelId}-field`}
                  value={draft}
                  onChangeText={setDraft}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.currentTarget.value)}
                  disabled={saving}
                  autoFocus
                  aria-labelledby={labelId}
                  onBlur={() => {
                    if (skipBlurSave.current || saving) {
                      return;
                    }

                    void commit();
                  }}
                  onKeyDown={(e: { nativeEvent?: { key?: string }; key?: string }) => {
                    const key = e.key ?? e.nativeEvent?.key ?? "";
                    if (key === "Escape") {
                      cancel();
                    }

                    if (key === "Enter") {
                      void commit();
                    }
                  }}
                  backgroundColor="$boardPanelSurfaceStrong"
                  borderColor="$boardShellBorder"
                />
              </YStack>
              <XStack gap="$2" flexWrap="wrap">
                <BoardActionButton tone="accent" disabled={saving} onPress={() => void commit()}>
                  {saving ? "Saving…" : "Save"}
                </BoardActionButton>
                <BoardActionButton tone="ghost" disabled={saving} onPress={cancel}>
                  Cancel
                </BoardActionButton>
              </XStack>
            </YStack>
          ) : (
            <XStack alignItems="center" gap="$3" minWidth={0} flex={1}>
              <Text fontWeight="800" color="$boardHeading" fontSize="$6" numberOfLines={1}>
                {lane.title}
              </Text>
              <BoardPill>{lane.cards.length}</BoardPill>
            </XStack>
          )}
        </XStack>
        {!editing ? (
          <XStack gap="$2" flexWrap="wrap">
            <BoardActionButton
              tone="ghost"
              disabled={blockActions}
              onPress={() => onMoveColumn(columnId, "left")}
            >
              ←
            </BoardActionButton>
            <BoardActionButton
              tone="ghost"
              disabled={blockActions}
              onPress={() => onMoveColumn(columnId, "right")}
            >
              →
            </BoardActionButton>
            <BoardActionButton
              tone="ghost"
              disabled={blockActions}
              onPress={() => {
                setDraft(lane.title);
                setEditing(true);
              }}
            >
              Rename
            </BoardActionButton>
            <BoardActionButton
              tone="ghost"
              disabled={blockActions}
              onPress={() => onOpenCreateColumnAfter(columnId)}
            >
              Add after
            </BoardActionButton>
          </XStack>
        ) : null}
      </XStack>
    </YStack>
  );
}

function BoardLaneView({
  lane,
  canReorder,
  dragHandleProps,
  onOpenCard,
  onOpenCreateCard,
  onRenameColumn,
  renamePendingColumnId,
  onOpenCreateColumnAfter,
  onMoveColumn,
  onMoveCard,
}: Readonly<{
  lane: BoardLane;
  canReorder: boolean;
  dragHandleProps?: Record<string, unknown>;
  onOpenCard: (cardId: string) => void;
  onOpenCreateCard: (columnId: string) => void;
  onRenameColumn: (input: {
    columnId: string;
    title: string;
    expectedVersion: number;
  }) => Promise<void>;
  renamePendingColumnId: string | null;
  onOpenCreateColumnAfter: (columnId?: string | null) => void;
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  onMoveCard: (cardId: string, direction: "up" | "down" | "left" | "right") => void;
}>) {
  const isRealColumn = lane.laneKind === "column" && lane.originalColumnId;

  return (
    <BoardSurface padding="$4">
      <YStack gap="$3">
        <YStack gap="$2">
          {isRealColumn ? (
            <ColumnHeaderWithInlineRename
              lane={lane}
              columnId={isRealColumn}
              dragHandleProps={dragHandleProps}
              onMoveColumn={onMoveColumn}
              onOpenCreateColumnAfter={onOpenCreateColumnAfter}
              onRenameColumn={onRenameColumn}
              renamePendingColumnId={renamePendingColumnId}
            />
          ) : (
            <XStack
              alignItems="center"
              justifyContent="space-between"
              gap="$3"
              {...dragHandleProps}
            >
              <XStack alignItems="center" gap="$3" minWidth={0}>
                <Stack width={12} height={12} borderRadius={9999} backgroundColor="$boardAccent" />
                <Text fontWeight="800" color="$boardHeading" fontSize="$6" numberOfLines={1}>
                  {lane.title}
                </Text>
                <BoardPill>{lane.cards.length}</BoardPill>
              </XStack>
            </XStack>
          )}
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
