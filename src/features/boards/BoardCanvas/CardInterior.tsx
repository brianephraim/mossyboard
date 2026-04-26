import type { DraggableProvided } from "@hello-pangea/dnd";
import { useState } from "react";
import { Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import {
  FormInlineAutoGrowTextAreaField,
  FormInlineRenameField,
  FormInlineSubmitField,
} from "../../../form";
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
  onRenameTitle: (input: {
    cardId: string;
    title: string;
    description: string;
    priority: BoardLane["cards"][number]["priority"];
    expectedVersion: number;
  }) => Promise<void>;
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
  onRenameTitle,
}: Readonly<CardInteriorProps>) {
  const { visible, onHoverChange, onFocus, onBlur } = useEdgeHoverFocus({
    includeFocusWithin: false,
  });
  const moveControlsVisible = canMove && visible;
  const [descriptionFocused, setDescriptionFocused] = useState(false);

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
          <FormInlineRenameField
            ariaLabel="Card title"
            defaultValue={card.title}
            focusOnMouseUp
            onSubmitTitle={async (nextTitle) => {
              await onRenameTitle({
                cardId: card.id,
                title: nextTitle,
                description: card.description,
                priority: card.priority,
                expectedVersion: card.version,
              });
            }}
            inputProps={{
              width: "auto",
              maxWidth: "100%",
              flexGrow: 1,
              flexShrink: 1,
              minWidth: 0,
              color: "$boardHeading",
              fontSize: "$5",
              fontWeight: "700",
              borderWidth: 1,
              borderRadius: "$4",
              borderColor: "transparent",
              backgroundColor: "transparent",
              boxShadow: "transparent 0px 0px 0px 0px",
              paddingHorizontal: 0,
              paddingVertical: 0,
              focusStyle: { outlineWidth: 0 },
              focusVisibleStyle: {
                outlineWidth: 0,
                backgroundColor: "$boardPanelSurfaceStrong",
                borderColor: "$boardAccent",
                boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
              },
            }}
          />
          <PriorityPill priority={card.priority} />
        </XStack>
        <FormInlineSubmitField<string>
          defaultValue={card.description}
          submitOnEnter={false}
          normalize={(value) => value.trimEnd()}
          isNoop={(next, current) => next === current}
          onSubmitValue={async (nextDescription) => {
            await onRenameTitle({
              cardId: card.id,
              title: card.title,
              description: nextDescription,
              priority: card.priority,
              expectedVersion: card.version,
            });
          }}
          render={({ onBlur: onSubmitBlur, onKeyDown }) => (
            <FormInlineAutoGrowTextAreaField<{ value: string }, "value">
              name="value"
              aria-label="Card description"
              defaultValue={card.description}
              placeholder="Add a description…"
              focusOnMouseUp
              onBlur={() => {
                setDescriptionFocused(false);
                onSubmitBlur();
              }}
              onKeyDown={onKeyDown}
              color="$boardTextMuted"
              fontSize="$3"
              borderWidth={1}
              borderRadius="$4"
              borderColor="transparent"
              backgroundColor="transparent"
              boxShadow="transparent 0px 0px 0px 0px"
              paddingHorizontal={0}
              paddingVertical={0}
              minHeightPx={24}
              maxHeightPx={descriptionFocused ? undefined : 180}
              onFocus={() => {
                setDescriptionFocused(true);
              }}
              focusStyle={{ outlineWidth: 0 }}
              focusVisibleStyle={{
                outlineWidth: 0,
                backgroundColor: "$boardPanelSurfaceStrong",
                borderColor: "$boardAccent",
                boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
              }}
            />
          )}
        />

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
  onRenameTitle,
}: Readonly<{
  card: BoardLane["cards"][number];
  showColumnContext: boolean;
  canMove: boolean;
  onOpen: () => void;
  onMove: (cardId: string, direction: Direction) => void;
  onRenameTitle: CardInteriorProps["onRenameTitle"];
}>) {
  return (
    <BoardSurface padding="$4">
      <CardInterior
        card={card}
        showColumnContext={showColumnContext}
        canMove={canMove}
        onOpen={onOpen}
        onMove={onMove}
        onRenameTitle={onRenameTitle}
      />
    </BoardSurface>
  );
}
