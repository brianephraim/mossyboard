import type { DraggableProvided } from "@hello-pangea/dnd";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Stack, Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { BoardActionButton, BoardPill, BoardSurface } from "../ui";
import type { BoardDetailSearch, BoardLane, CardPriority } from "../types";
import { CardInterior } from "./CardInterior";
import { ColumnHeaderWithInlineRename } from "./ColumnHeader";
import { LaneEmptyState } from "./LaneEmptyState";
import { StaticLaneCards } from "./StaticLaneCards";
import { dndCardListStyle, dndCardShellStyle, mergeDraggableStyle } from "./layout";

type Direction = "up" | "down" | "left" | "right";

type BoardLaneViewProps = {
  lane: BoardLane;
  canReorder: boolean;
  groupBy: BoardDetailSearch["groupBy"];
  hasActivePriorityFilters: boolean;
  canMoveColumn: boolean;
  groupedBoardReorderEnabled: boolean;
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
  onMoveCard: (cardId: string, direction: Direction) => void;
  onMovePriorityGroupCard: (
    cardId: string,
    priority: CardPriority,
    direction: "up" | "down",
  ) => void;
};

export function BoardLaneView({
  lane,
  canReorder,
  groupBy,
  hasActivePriorityFilters,
  canMoveColumn,
  groupedBoardReorderEnabled,
  dragHandleProps,
  onOpenCard,
  onOpenCreateCard,
  onRenameColumn,
  renamePendingColumnId,
  onMoveColumn,
  onMoveCard,
  onMovePriorityGroupCard,
}: Readonly<BoardLaneViewProps>) {
  const isRealColumn = lane.laneKind === "column" && lane.originalColumnId;

  return (
    <BoardSurface
      padding="$0"
      height="100%"
      tag="section"
      aria-label={isRealColumn ? `${lane.title} column` : lane.title}
    >
      <YStack flex={1} minHeight={0}>
        <YStack padding="$4" paddingBottom="$0" gap="$2" flexShrink={0}>
          {isRealColumn ? (
            <ColumnHeaderWithInlineRename
              lane={lane}
              columnId={isRealColumn}
              canMoveColumn={canMoveColumn}
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
                  <Text
                    tag="h2"
                    fontWeight="800"
                    color="$boardHeading"
                    fontSize="$6"
                    numberOfLines={1}
                  >
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
                              showColumnContext={false}
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
                    <LaneEmptyState
                      isVisible
                      isRealColumn={Boolean(isRealColumn)}
                      isFiltered={hasActivePriorityFilters}
                    />
                  ) : null}
                </YStack>
              </div>
            )}
          </Droppable>
        ) : (
          <StaticLaneCards
            lane={lane}
            groupBy={groupBy}
            hasActivePriorityFilters={hasActivePriorityFilters}
            groupedBoardReorderEnabled={groupedBoardReorderEnabled}
            onOpenCard={onOpenCard}
            onMoveCard={onMoveCard}
            onMovePriorityGroupCard={onMovePriorityGroupCard}
          />
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
