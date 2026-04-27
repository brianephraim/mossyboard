import type { DraggableProvided } from "@hello-pangea/dnd";
import { Stack, Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { BoardActionButton, BoardPill, BoardSurface } from "../ui";
import type { BoardDetailSearch, BoardLane, CardPriority } from "../types";
import type { BoardKey } from "../useDualBoardDnd";
import type { CardTagsRowTag } from "./CardTagsRow";
import { ColumnHeaderWithInlineRename } from "./ColumnHeader";
import { LaneEmptyState } from "./LaneEmptyState";
import { StaticLaneCards } from "./StaticLaneCards";
import { VirtualizedCardList } from "./VirtualizedCardList";

type Direction = "up" | "down" | "left" | "right";

const noop = () => undefined;

type BoardLaneViewProps = {
  lane: BoardLane;
  canReorder: boolean;
  groupBy: BoardDetailSearch["groupBy"];
  hasActivePriorityFilters: boolean;
  canMoveColumn: boolean;
  groupedBoardReorderEnabled: boolean;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onDeleteCard: (input: { cardId: string; expectedVersion: number }) => Promise<void>;
  onOpenCreateCard: (columnId: string) => void;
  onAddTag: (input: { cardId: string; name: string }) => Promise<void>;
  onDetachTag: (input: { cardId: string; tagId: string }) => Promise<void>;
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
  dndScopeKey?: BoardKey;
  bottomScrollPadding?: number;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
};

export function BoardLaneView({
  lane,
  canReorder,
  groupBy,
  hasActivePriorityFilters,
  canMoveColumn,
  groupedBoardReorderEnabled,
  dragHandleProps,
  availableTags,
  onDeleteCard,
  onOpenCreateCard,
  onAddTag,
  onDetachTag,
  onRenameCardTitle,
  onRenameColumn,
  renamePendingColumnId,
  onMoveColumn,
  onMoveCard,
  onMovePriorityGroupCard,
  dndScopeKey,
  bottomScrollPadding,
  hasNextPage = false,
  onLoadMore,
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
                    fontFamily="$heading"
                    fontWeight="700"
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
          <YStack flex={1} minHeight={0} position="relative">
            <LaneEmptyState
              isVisible={lane.cards.length === 0}
              isRealColumn={Boolean(isRealColumn)}
              isFiltered={hasActivePriorityFilters}
            />
            <VirtualizedCardList
              columnId={isRealColumn}
              cards={lane.cards}
              hasNextPage={hasNextPage}
              onLoadMore={onLoadMore ?? noop}
              bottomScrollPadding={bottomScrollPadding}
              dndScopeKey={dndScopeKey}
              availableTags={availableTags}
              onDeleteCard={onDeleteCard}
              onMoveCard={onMoveCard}
              onAddTag={onAddTag}
              onDetachTag={onDetachTag}
              onRenameCardTitle={onRenameCardTitle}
            />
          </YStack>
        ) : (
          <StaticLaneCards
            lane={lane}
            groupBy={groupBy}
            hasActivePriorityFilters={hasActivePriorityFilters}
            groupedBoardReorderEnabled={groupedBoardReorderEnabled}
            availableTags={availableTags}
            onDeleteCard={onDeleteCard}
            onMoveCard={onMoveCard}
            onMovePriorityGroupCard={onMovePriorityGroupCard}
            onAddTag={onAddTag}
            onDetachTag={onDetachTag}
            onRenameCardTitle={onRenameCardTitle}
            dndScopeKey={dndScopeKey}
            bottomScrollPadding={bottomScrollPadding}
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
