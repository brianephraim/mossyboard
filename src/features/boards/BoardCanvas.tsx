import type { DraggableProvided, DropResult, Sensor, SensorAPI } from "@hello-pangea/dnd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  cloneElement,
  isValidElement,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Input } from "@tamagui/input";
import { Stack, Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { BoardActionButton, BoardInlineNotice, BoardPill, BoardSurface, PriorityPill } from "./ui";
import { buildBoardLanes } from "./model";
import type { BoardDetailSearch, BoardLane, LoadedBoard } from "./types";

const BOARD_DND_GAP_PX = 16;
const COLUMN_WIDTH_PX = 320;
const INSERT_COLUMN_BUTTON_SIZE_PX = 26;
const CARD_MOVE_EDGE_SIZE_PX = 15;
const CARD_CHROME_PADDING_PX = 16;
const INSERT_COLUMN_BUTTON_OFFSET_PX = Math.round(
  BOARD_DND_GAP_PX / 2 + INSERT_COLUMN_BUTTON_SIZE_PX / 2,
);
const INSERT_COLUMN_BUTTON_SAFE_TOP_PX = 24;

const dndHorizontalRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
  minWidth: "max-content",
  height: "100%",
  boxSizing: "border-box",
};

const dndColumnShellStyle: CSSProperties = {
  width: COLUMN_WIDTH_PX,
  minWidth: COLUMN_WIDTH_PX,
  flexShrink: 0,
  marginRight: BOARD_DND_GAP_PX,
  height: "100%",
};

const dndCardListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  // Use margins for spacing so hello-pangea's placeholder preserves exact vertical rhythm.
  // (The placeholder sizing logic accounts for margins; `gap` can visually "jump" on drag start.)
  marginBottom: -BOARD_DND_GAP_PX,
  minHeight: 120,
};

/** Card chrome on the HTML drag wrapper (matches board card tokens; no backdrop-filter). */
const dndCardShellStyle: CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(121, 138, 91, 0.16)",
  backgroundColor: "#ffffff",
  boxShadow: "rgba(81, 102, 57, 0.1) 0px 8px 24px",
  padding: 16,
  marginBottom: BOARD_DND_GAP_PX,
  boxSizing: "border-box",
};

function mergeDraggableStyle(
  base: CSSProperties,
  draggableProps: DraggableProvided["draggableProps"],
): { rest: Record<string, unknown>; style: CSSProperties } {
  const { style: dragStyle, ...rest } = draggableProps;
  return {
    rest: rest as Record<string, unknown>,
    style: { ...base, ...(dragStyle as CSSProperties | undefined) },
  };
}

function columnPlaceholder(placeholder: ReactNode) {
  if (!placeholder || !isValidElement(placeholder)) {
    return placeholder;
  }

  const props = (placeholder.props ?? {}) as { style?: CSSProperties };
  return cloneElement(
    placeholder as ReactElement<any>,
    {
      style: {
        ...(props.style ?? {}),
        flex: "0 0 auto",
        flexShrink: 0,
        marginRight: BOARD_DND_GAP_PX,
      },
    } as any,
  );
}

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
  const columns = board.columns;
  const sensorApiRef = useRef<SensorAPI | null>(null);

  const programmaticSensor: Sensor = useMemo(() => {
    return (api) => {
      sensorApiRef.current = api;
    };
  }, []);

  const moveCardProgrammatically = (
    cardId: string,
    direction: "up" | "down" | "left" | "right",
  ) => {
    if (!canReorder) {
      onMoveCard(cardId, direction);
      return;
    }

    const api = sensorApiRef.current;
    if (!api) {
      return;
    }

    const preDrag = api.tryGetLock(cardId);
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
  };

  return (
    <YStack gap="$4" flex={1} minHeight={0} overflow="hidden">
      {!canReorder && search.view === "board" ? (
        <YStack paddingHorizontal="$5">
          <BoardInlineNotice
            tone="warning"
            message="Drag and keyboard reorder controls are available only in board view grouped by column with no active priority filters."
          />
        </YStack>
      ) : null}

      <div
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          maxWidth: "100%",
          width: "100%",
          flex: "1 1 auto",
          minHeight: 0,
        }}
      >
        {canReorder ? (
          <DragDropContext onDragEnd={onDragEnd} sensors={[programmaticSensor]}>
            <Droppable
              droppableId="board-columns"
              direction="horizontal"
              type="COLUMN"
              ignoreContainerClipping
            >
              {(provided) => (
                <div
                  style={{
                    ...dndHorizontalRowStyle,
                    paddingLeft: "var(--c-space-5)",
                    paddingRight: "var(--c-space-5)",
                    paddingTop: INSERT_COLUMN_BUTTON_SAFE_TOP_PX,
                    paddingBottom: "var(--c-space-5)",
                    marginRight: -BOARD_DND_GAP_PX,
                  }}
                >
                  <div style={dndHorizontalRowStyle}>
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{ ...dndHorizontalRowStyle, marginRight: -BOARD_DND_GAP_PX }}
                    >
                      {showColumnManagement && columns.length === 0 ? (
                        <YStack width={COLUMN_WIDTH_PX} minWidth={COLUMN_WIDTH_PX} padding="$5">
                          <InsertColumnCircleButton
                            ariaLabel="Add first column"
                            onPress={() => onOpenCreateColumnAfter(null)}
                          />
                        </YStack>
                      ) : null}

                      {columns.map((column, columnIndex) => (
                        <Draggable key={column.id} draggableId={column.id} index={columnIndex}>
                          {(columnProvided) => {
                            const { rest: colDragRest, style: colDragStyle } = mergeDraggableStyle(
                              dndColumnShellStyle,
                              columnProvided.draggableProps,
                            );
                            return (
                              <div
                                ref={columnProvided.innerRef}
                                {...colDragRest}
                                style={{ position: "relative", ...colDragStyle }}
                              >
                                {showColumnManagement && columnIndex === 0 ? (
                                  <div
                                    style={{
                                      position: "absolute",
                                      left: -INSERT_COLUMN_BUTTON_OFFSET_PX,
                                      top: 6,
                                      zIndex: 2,
                                    }}
                                  >
                                    <InsertColumnCircleButton
                                      ariaLabel="Add column before first column"
                                      onPress={() => onOpenCreateColumnAfter(null)}
                                    />
                                  </div>
                                ) : null}

                                {showColumnManagement ? (
                                  <div
                                    style={{
                                      position: "absolute",
                                      right: -INSERT_COLUMN_BUTTON_OFFSET_PX,
                                      top: 6,
                                      zIndex: 2,
                                    }}
                                  >
                                    <InsertColumnCircleButton
                                      ariaLabel={
                                        columnIndex === columns.length - 1
                                          ? "Add column after last column"
                                          : "Add column between columns"
                                      }
                                      onPress={() => onOpenCreateColumnAfter(column.id)}
                                    />
                                  </div>
                                ) : null}

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
                                  onMoveCard={canReorder ? moveCardProgrammatically : onMoveCard}
                                />
                              </div>
                            );
                          }}
                        </Draggable>
                      ))}
                      {columnPlaceholder(provided.placeholder)}
                    </div>
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <XStack
            gap="$4"
            alignItems="flex-start"
            minWidth="max-content"
            paddingHorizontal="$5"
            paddingTop={INSERT_COLUMN_BUTTON_SAFE_TOP_PX}
            paddingBottom="$5"
          >
            {showColumnManagement && columns.length === 0 ? (
              <YStack width={COLUMN_WIDTH_PX} minWidth={COLUMN_WIDTH_PX} padding="$5">
                <InsertColumnCircleButton
                  ariaLabel="Add first column"
                  onPress={() => onOpenCreateColumnAfter(null)}
                />
              </YStack>
            ) : null}

            {lanes.map((lane, laneIndex) => (
              <YStack key={lane.id} width={320} minWidth={320} position="relative">
                {showColumnManagement && laneIndex === 0 ? (
                  <YStack
                    position="absolute"
                    left={-INSERT_COLUMN_BUTTON_OFFSET_PX}
                    top={6}
                    zIndex={2}
                  >
                    <InsertColumnCircleButton
                      ariaLabel="Add column before first column"
                      onPress={() => onOpenCreateColumnAfter(null)}
                    />
                  </YStack>
                ) : null}

                {showColumnManagement ? (
                  <YStack
                    position="absolute"
                    right={-INSERT_COLUMN_BUTTON_OFFSET_PX}
                    top={6}
                    zIndex={2}
                  >
                    <InsertColumnCircleButton
                      ariaLabel={
                        laneIndex === lanes.length - 1
                          ? "Add column after last column"
                          : "Add column between columns"
                      }
                      onPress={() => onOpenCreateColumnAfter(lane.id)}
                    />
                  </YStack>
                ) : null}

                <BoardLaneView
                  lane={lane}
                  canReorder={false}
                  onOpenCard={onOpenCard}
                  onOpenCreateCard={onOpenCreateCard}
                  onRenameColumn={onRenameColumn}
                  renamePendingColumnId={renamePendingColumnId}
                  onOpenCreateColumnAfter={onOpenCreateColumnAfter}
                  onMoveColumn={onMoveColumn}
                  onMoveCard={canReorder ? moveCardProgrammatically : onMoveCard}
                />
              </YStack>
            ))}
          </XStack>
        )}
      </div>
    </YStack>
  );
}

function ColumnHeaderWithInlineRename({
  lane,
  columnId,
  dragHandleProps,
  onMoveColumn,
  onRenameColumn,
  renamePendingColumnId,
}: Readonly<{
  lane: BoardLane;
  columnId: string;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
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
      <div {...(dragHandleProps ?? {})} style={{ width: "100%" }}>
        <YStack gap="$2">
          <XStack alignItems="center" gap="$3" minWidth={0}>
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
                    onChange={(e) => {
                      const event = e as unknown as {
                        currentTarget?: { value?: string };
                        nativeEvent?: { text?: string };
                      };
                      setDraft(event.currentTarget?.value ?? event.nativeEvent?.text ?? "");
                    }}
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
            </XStack>
          ) : null}
        </YStack>
      </div>
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
  dragHandleProps?: DraggableProvided["dragHandleProps"];
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
    <BoardSurface padding="$0" height="100%">
      <YStack flex={1} minHeight={0}>
        <YStack padding="$4" paddingBottom="$0" gap="$2" flexShrink={0}>
          {isRealColumn ? (
            <ColumnHeaderWithInlineRename
              lane={lane}
              columnId={isRealColumn}
              dragHandleProps={dragHandleProps}
              onMoveColumn={onMoveColumn}
              onRenameColumn={onRenameColumn}
              renamePendingColumnId={renamePendingColumnId}
            />
          ) : (
            <div {...(dragHandleProps ?? {})} style={{ width: "100%" }}>
              <XStack alignItems="center" justifyContent="space-between" gap="$3">
                <XStack alignItems="center" gap="$3" minWidth={0}>
                  <Stack
                    width={12}
                    height={12}
                    borderRadius={9999}
                    backgroundColor="$boardAccent"
                  />
                  <Text fontWeight="800" color="$boardHeading" fontSize="$6" numberOfLines={1}>
                    {lane.title}
                  </Text>
                  <BoardPill>{lane.cards.length}</BoardPill>
                </XStack>
              </XStack>
            </div>
          )}
          {lane.helperText ? <Text color="$boardTextMuted">{lane.helperText}</Text> : null}
        </YStack>

        {canReorder && isRealColumn ? (
          <Droppable droppableId={isRealColumn} type="CARD" ignoreContainerClipping>
            {(provided) => (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: "1 1 auto",
                  minHeight: 0,
                }}
              >
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    ...dndCardListStyle,
                    overflowY: "auto",
                    flex: "1 1 auto",
                    minHeight: 0,
                    paddingLeft: "var(--c-space-4)",
                    paddingRight: "var(--c-space-4)",
                    paddingTop: "var(--c-space-3)",
                  }}
                >
                  {lane.cards.map((card, index) => (
                    <Draggable
                      key={card.id}
                      draggableId={card.id}
                      index={index}
                      disableInteractiveElementBlocking
                    >
                      {(cardProvided) => {
                        const { rest: cardDragRest, style: cardDragStyle } = mergeDraggableStyle(
                          dndCardShellStyle,
                          cardProvided.draggableProps,
                        );
                        return (
                          <div ref={cardProvided.innerRef} {...cardDragRest} style={cardDragStyle}>
                            <CardInterior
                              card={card}
                              showColumnContext={lane.laneKind === "priority"}
                              canMove
                              dragHandleProps={cardProvided.dragHandleProps}
                              onOpen={() => onOpenCard(card.id)}
                              onMove={onMoveCard}
                            />
                          </div>
                        );
                      }}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
                <YStack paddingHorizontal="$4" paddingTop="$3" gap="$3">
                  {lane.cards.length === 0 ? (
                    <LaneEmptyState isVisible isRealColumn={Boolean(isRealColumn)} />
                  ) : null}
                </YStack>
              </div>
            )}
          </Droppable>
        ) : (
          <YStack
            gap="$3"
            flex={1}
            minHeight={0}
            overflow="scroll"
            paddingHorizontal="$4"
            paddingTop="$3"
          >
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
            />
          </YStack>
        )}

        {isRealColumn ? (
          <YStack padding="$4" paddingTop="$3">
            <BoardActionButton tone="ghost" onPress={() => onOpenCreateCard(isRealColumn)}>
              + Add card
            </BoardActionButton>
          </YStack>
        ) : null}
      </YStack>
    </BoardSurface>
  );
}

/** Tamagui-only card body; drag handle is a plain `div` for hello-pangea. */
function CardInterior({
  card,
  showColumnContext,
  canMove,
  dragHandleProps,
  onOpen,
  onMove,
}: Readonly<{
  card: BoardLane["cards"][number];
  showColumnContext: boolean;
  canMove: boolean;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  onOpen: () => void;
  onMove: (cardId: string, direction: "up" | "down" | "left" | "right") => void;
}>) {
  const [edgeHoverCount, setEdgeHoverCount] = useState(0);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const moveControlsVisible = canMove && (edgeHoverCount > 0 || isFocusWithin);

  return (
    <div
      {...(dragHandleProps ?? {})}
      style={{
        cursor: dragHandleProps ? "grab" : undefined,
      }}
    >
      <YStack
        gap="$3"
        position="relative"
        onFocus={() => setIsFocusWithin(true)}
        onBlur={(e: FocusEvent) => {
          const nextTarget = e.relatedTarget as unknown as Node | null;
          if (!nextTarget) {
            setIsFocusWithin(false);
            return;
          }

          if (!e.currentTarget.contains(nextTarget)) {
            setIsFocusWithin(false);
          }
        }}
      >
        {canMove ? (
          <>
            <Stack
              position="absolute"
              left={-CARD_CHROME_PADDING_PX}
              top={-CARD_CHROME_PADDING_PX}
              bottom={-CARD_CHROME_PADDING_PX}
              width={CARD_MOVE_EDGE_SIZE_PX}
              zIndex={2}
              opacity={moveControlsVisible ? 1 : 0}
              onMouseEnter={() => setEdgeHoverCount((v) => v + 1)}
              onMouseLeave={() => setEdgeHoverCount((v) => Math.max(0, v - 1))}
            >
              <BoardActionButton
                tone="ghost"
                aria-label="Move card left"
                onPress={() => onMove(card.id, "left")}
                width="100%"
                height="100%"
                borderWidth={0}
                borderRadius={0}
                paddingHorizontal={0}
                paddingVertical={0}
                justifyContent="center"
                alignItems="center"
                backgroundColor="rgba(255, 255, 255, 0.01)"
                hoverStyle={{ backgroundColor: "rgba(145, 168, 108, 0.12)" }}
                pressStyle={{ backgroundColor: "rgba(145, 168, 108, 0.18)" }}
              >
                <Text fontSize="$6" fontWeight="800" color="$boardTextMuted">
                  ‹
                </Text>
              </BoardActionButton>
            </Stack>

            <Stack
              position="absolute"
              right={-CARD_CHROME_PADDING_PX}
              top={-CARD_CHROME_PADDING_PX}
              bottom={-CARD_CHROME_PADDING_PX}
              width={CARD_MOVE_EDGE_SIZE_PX}
              zIndex={2}
              opacity={moveControlsVisible ? 1 : 0}
              onMouseEnter={() => setEdgeHoverCount((v) => v + 1)}
              onMouseLeave={() => setEdgeHoverCount((v) => Math.max(0, v - 1))}
            >
              <BoardActionButton
                tone="ghost"
                aria-label="Move card right"
                onPress={() => onMove(card.id, "right")}
                width="100%"
                height="100%"
                borderWidth={0}
                borderRadius={0}
                paddingHorizontal={0}
                paddingVertical={0}
                justifyContent="center"
                alignItems="center"
                backgroundColor="rgba(255, 255, 255, 0.01)"
                hoverStyle={{ backgroundColor: "rgba(145, 168, 108, 0.12)" }}
                pressStyle={{ backgroundColor: "rgba(145, 168, 108, 0.18)" }}
              >
                <Text fontSize="$6" fontWeight="800" color="$boardTextMuted">
                  ›
                </Text>
              </BoardActionButton>
            </Stack>

            <BoardActionButton
              tone="ghost"
              aria-label="Move card up"
              onPress={() => onMove(card.id, "up")}
              position="absolute"
              left={-CARD_CHROME_PADDING_PX}
              right={-CARD_CHROME_PADDING_PX}
              top={-CARD_CHROME_PADDING_PX}
              height={CARD_MOVE_EDGE_SIZE_PX}
              zIndex={2}
              opacity={moveControlsVisible ? 1 : 0}
              borderWidth={0}
              borderRadius={0}
              paddingHorizontal={0}
              paddingVertical={0}
              justifyContent="center"
              alignItems="center"
              backgroundColor="rgba(255, 255, 255, 0.01)"
              hoverStyle={{ backgroundColor: "rgba(145, 168, 108, 0.12)" }}
              pressStyle={{ backgroundColor: "rgba(145, 168, 108, 0.18)" }}
              onMouseEnter={() => setEdgeHoverCount((v) => v + 1)}
              onMouseLeave={() => setEdgeHoverCount((v) => Math.max(0, v - 1))}
            >
              <Text fontSize="$5" fontWeight="900" color="$boardTextMuted">
                ˄
              </Text>
            </BoardActionButton>

            <BoardActionButton
              tone="ghost"
              aria-label="Move card down"
              onPress={() => onMove(card.id, "down")}
              position="absolute"
              left={-CARD_CHROME_PADDING_PX}
              right={-CARD_CHROME_PADDING_PX}
              bottom={-CARD_CHROME_PADDING_PX}
              height={CARD_MOVE_EDGE_SIZE_PX}
              zIndex={2}
              opacity={moveControlsVisible ? 1 : 0}
              borderWidth={0}
              borderRadius={0}
              paddingHorizontal={0}
              paddingVertical={0}
              justifyContent="center"
              alignItems="center"
              backgroundColor="rgba(255, 255, 255, 0.01)"
              hoverStyle={{ backgroundColor: "rgba(145, 168, 108, 0.12)" }}
              pressStyle={{ backgroundColor: "rgba(145, 168, 108, 0.18)" }}
              onMouseEnter={() => setEdgeHoverCount((v) => v + 1)}
              onMouseLeave={() => setEdgeHoverCount((v) => Math.max(0, v - 1))}
            >
              <Text fontSize="$5" fontWeight="900" color="$boardTextMuted">
                ˅
              </Text>
            </BoardActionButton>
          </>
        ) : null}

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

        <XStack gap="$2" flexWrap="wrap" alignItems="center">
          <BoardActionButton tone="ghost" onPress={onOpen}>
            Open
          </BoardActionButton>
          {showColumnContext ? <BoardPill>{card.originalColumnTitle}</BoardPill> : null}
        </XStack>
      </YStack>
    </div>
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
      <CardInterior
        card={card}
        showColumnContext={showColumnContext}
        canMove={canMove}
        onOpen={onOpen}
        onMove={onMove}
      />
    </BoardSurface>
  );
}

function LaneEmptyState({
  isVisible,
  isRealColumn,
}: Readonly<{
  isVisible: boolean;
  isRealColumn: boolean;
}>) {
  if (!isVisible) {
    return null;
  }

  return (
    <Text color="$boardTextMuted" fontSize="$3">
      {isRealColumn
        ? "This column is empty. Add a card to get it moving."
        : "No cards match this group right now."}
    </Text>
  );
}

function InsertColumnCircleButton({
  ariaLabel,
  onPress,
}: Readonly<{
  ariaLabel: string;
  onPress: () => void;
}>) {
  return (
    <BoardActionButton
      tone="ghost"
      aria-label={ariaLabel}
      onPress={onPress}
      width={INSERT_COLUMN_BUTTON_SIZE_PX}
      height={INSERT_COLUMN_BUTTON_SIZE_PX}
      borderRadius={9999}
      paddingHorizontal={0}
      paddingVertical={0}
      borderWidth={1}
      borderColor="$boardShellBorder"
      backgroundColor="$boardPanelSurfaceStrong"
      hoverStyle={{ backgroundColor: "$boardAccentWash" }}
      marginTop={-20}
    >
      +
    </BoardActionButton>
  );
}
