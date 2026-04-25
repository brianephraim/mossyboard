import type { DraggableProvided } from "@hello-pangea/dnd";
import { Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { BoardActionButton, BoardPill, BoardSurface, PriorityPill } from "../ui";
import type { BoardLane } from "../types";
import { EdgeMoveButton } from "./EdgeMoveButton";
import { CARD_MOVE_EDGE_SIZE_PX } from "./layout";
import { useEdgeHoverFocus } from "./useEdgeHoverFocus";

type Direction = "up" | "down" | "left" | "right";

type CardInteriorProps = {
  card: BoardLane["cards"][number];
  showColumnContext: boolean;
  canMove: boolean;
  moveDirections?: Array<Direction>;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  onOpen: () => void;
  onMove: (cardId: string, direction: Direction) => void;
};

/** Tamagui-only card body; drag handle is a plain `div` for hello-pangea. */
export function CardInterior({
  card,
  showColumnContext,
  canMove,
  moveDirections = ["up", "down", "left", "right"],
  dragHandleProps,
  onOpen,
  onMove,
}: Readonly<CardInteriorProps>) {
  const { visible, onHoverChange, onFocus, onBlur } = useEdgeHoverFocus();
  const moveControlsVisible = canMove && visible;

  return (
    <div {...(dragHandleProps ?? {})} style={{ cursor: dragHandleProps ? "grab" : undefined }}>
      <YStack gap="$3" position="relative" onFocus={onFocus} onBlur={onBlur}>
        {canMove
          ? moveDirections.map((direction) => (
              <EdgeMoveButton
                key={direction}
                direction={direction}
                ariaLabel={`Move card ${direction}`}
                visible={moveControlsVisible}
                thickness={CARD_MOVE_EDGE_SIZE_PX}
                onPress={() => onMove(card.id, direction)}
                onHoverChange={onHoverChange}
              />
            ))
          : null}

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

export function CardPreview({
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
  onMove: (cardId: string, direction: Direction) => void;
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
