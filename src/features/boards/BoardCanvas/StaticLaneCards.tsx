import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Stack, Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { BoardPill } from "../ui";
import { boardPriorityMeta, groupListItemsByPriority } from "../model";
import { getPriorityGroupDroppableId } from "../priorityGrouping";
import type { BoardDetailSearch, BoardLane, CardPriority } from "../types";
import type { BoardKey } from "../useDualBoardDnd";
import { scopeId } from "../useDualBoardDnd";
import { CardInterior, CardPreview } from "./CardInterior";
import { LaneEmptyState } from "./LaneEmptyState";
import {
  dndCardListStyle,
  dndCardShellStyle,
  mergeDraggableStyle,
  PRIORITY_GROUP_CARD_DROP_TYPE,
} from "./layout";

type Direction = "up" | "down" | "left" | "right";

type StaticLaneCardsProps = {
  lane: BoardLane;
  groupBy: BoardDetailSearch["groupBy"];
  hasActivePriorityFilters: boolean;
  groupedBoardReorderEnabled: boolean;
  onOpenCard: (cardId: string) => void;
  onMoveCard: (cardId: string, direction: Direction) => void;
  onMovePriorityGroupCard: (
    cardId: string,
    priority: CardPriority,
    direction: "up" | "down",
  ) => void;
  dndScopeKey?: BoardKey;
  bottomScrollPadding?: number;
};

export function StaticLaneCards({
  lane,
  groupBy,
  hasActivePriorityFilters,
  groupedBoardReorderEnabled,
  onOpenCard,
  onMoveCard,
  onMovePriorityGroupCard,
  dndScopeKey,
  bottomScrollPadding,
}: Readonly<StaticLaneCardsProps>) {
  if (groupBy === "priority") {
    const visibleGroups = groupListItemsByPriority(lane.cards).filter(
      (group) => group.cards.length > 0,
    );

    return (
      <YStack
        gap="$4"
        flex={1}
        minHeight={0}
        overflow="scroll"
        paddingHorizontal="$4"
        paddingTop="$3"
      >
        {visibleGroups.map((group, index) => (
          <PriorityGroupSection
            key={`${lane.id}-${group.priority}`}
            group={group}
            laneId={lane.id}
            showDivider={index > 0}
            canReorder={groupedBoardReorderEnabled}
            onOpenCard={onOpenCard}
            onMoveCard={onMoveCard}
            onMovePriorityGroupCard={onMovePriorityGroupCard}
            dndScopeKey={dndScopeKey}
            bottomScrollPadding={bottomScrollPadding}
          />
        ))}
        <LaneEmptyState
          isVisible={visibleGroups.length === 0}
          isRealColumn
          isFiltered={hasActivePriorityFilters}
        />
      </YStack>
    );
  }

  return (
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
          showColumnContext={false}
          canMove={false}
          onOpen={() => onOpenCard(card.id)}
          onMove={onMoveCard}
        />
      ))}
      <LaneEmptyState
        isVisible={lane.cards.length === 0}
        isRealColumn
        isFiltered={hasActivePriorityFilters}
      />
    </YStack>
  );
}

function PriorityGroupSection({
  group,
  laneId,
  showDivider,
  canReorder,
  onOpenCard,
  onMoveCard,
  onMovePriorityGroupCard,
  dndScopeKey,
  bottomScrollPadding,
}: Readonly<{
  group: ReturnType<typeof groupListItemsByPriority>[number];
  laneId: string;
  showDivider: boolean;
  canReorder: boolean;
  onOpenCard: (cardId: string) => void;
  onMoveCard: (cardId: string, direction: Direction) => void;
  onMovePriorityGroupCard: (
    cardId: string,
    priority: CardPriority,
    direction: "up" | "down",
  ) => void;
  dndScopeKey?: BoardKey;
  bottomScrollPadding?: number;
}>) {
  const scoped = (id: string) => (dndScopeKey ? scopeId(dndScopeKey, id) : id);
  return (
    <YStack
      gap="$2"
      paddingTop={showDivider ? "$3" : "$0"}
      borderTopWidth={showDivider ? 1 : 0}
      borderColor="$boardShellBorder"
    >
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Stack
          width={8}
          height={8}
          borderRadius={9999}
          backgroundColor={boardPriorityMeta[group.priority].accentColor as any}
          opacity={0.75}
        />
        <Text
          tag="h3"
          fontSize="$2"
          fontWeight="700"
          color="$boardTextMuted"
          textTransform="uppercase"
          letterSpacing={1}
        >
          {group.title}
        </Text>
        <BoardPill backgroundColor="$boardPanelSurfaceStrong" color="$boardTextSubtle">
          {group.cards.length}
        </BoardPill>
      </XStack>

      {canReorder ? (
        <Droppable
          droppableId={scoped(getPriorityGroupDroppableId(laneId, group.priority))}
          type={PRIORITY_GROUP_CARD_DROP_TYPE}
          ignoreContainerClipping
        >
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                ...dndCardListStyle,
                paddingTop: 0,
                minHeight: 0,
                paddingBottom: bottomScrollPadding ?? undefined,
              }}
            >
              {group.cards.map((card, index) => (
                <Draggable
                  key={card.id}
                  draggableId={scoped(card.id)}
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
                          moveDirections={["up", "down"]}
                          dragHandleProps={cardProvided.dragHandleProps}
                          onOpen={() => onOpenCard(card.id)}
                          onMove={(cardId, direction) => {
                            if (direction === "up" || direction === "down") {
                              onMovePriorityGroupCard(cardId, group.priority, direction);
                              return;
                            }

                            onMoveCard(cardId, direction);
                          }}
                        />
                      </div>
                    );
                  }}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ) : (
        <YStack gap="$3">
          {group.cards.map((card) => (
            <CardPreview
              key={card.id}
              card={card}
              showColumnContext={false}
              canMove={false}
              onOpen={() => onOpenCard(card.id)}
              onMove={onMoveCard}
            />
          ))}
        </YStack>
      )}
    </YStack>
  );
}
