import type { DraggableProvided } from "@hello-pangea/dnd";
import { useEffect, useState } from "react";
import { Text, Theme } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";
import { Popover } from "@tamagui/popover";

import {
  FormInlineAutoGrowTextAreaField,
  FormInlineRenameField,
  FormInlineSubmitField,
} from "../../../form";
import { boardPriorityMeta, boardPriorityValues } from "../model";
import { BoardActionButton, BoardPill, BoardSurface } from "../ui";
import type { BoardLane } from "../types";
import { CardTagsRow } from "./CardTagsRow";
import type { CardTagsRowTag } from "./CardTagsRow";
import { EdgeMoveButton } from "./EdgeMoveButton";
import { CARD_MOVE_EDGE_SIZE_PX } from "./layout";
import { useDragSafePress } from "./useDragSafePress";
import { useEdgeHoverFocus } from "./useEdgeHoverFocus";

type Direction = "up" | "down" | "left" | "right";

type CardInteriorProps = {
  card: BoardLane["cards"][number];
  showColumnContext: boolean;
  canMove: boolean;
  moveDirections?: Array<Direction>;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onOpen: () => void;
  onMove: (cardId: string, direction: Direction) => void;
  onAddTag: (input: { cardId: string; name: string }) => Promise<void>;
  onDetachTag: (input: { cardId: string; tagId: string }) => Promise<void>;
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
  availableTags,
  onOpen,
  onMove,
  onAddTag,
  onDetachTag,
  onRenameTitle,
}: Readonly<CardInteriorProps>) {
  const { visible, onHoverChange, onFocus, onBlur } = useEdgeHoverFocus({
    includeFocusWithin: false,
  });
  const moveControlsVisible = canMove && visible;
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false);
  const priorityPress = useDragSafePress({
    onActivate: () => setPriorityPickerOpen(true),
  });

  // Local optimistic priority — decoupled from the upstream board state pipeline so
  // the displayed pill reflects the user's choice the moment they click, even if the
  // global optimistic board update takes a turn of the event loop to propagate down.
  // Cleared automatically once the prop catches up to the chosen value.
  const [pendingPriority, setPendingPriority] = useState<
    BoardLane["cards"][number]["priority"] | null
  >(null);
  useEffect(() => {
    if (pendingPriority !== null && card.priority === pendingPriority) {
      setPendingPriority(null);
    }
  }, [card.priority, pendingPriority]);

  const displayedPriority = pendingPriority ?? card.priority;

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
          <Theme name="light">
            <Popover
              open={priorityPickerOpen}
              onOpenChange={setPriorityPickerOpen}
              placement="bottom-end"
            >
              <Popover.Anchor asChild>
                <BoardActionButton
                  aria-label="Edit priority"
                  tone="ghost"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  minHeight={0}
                  height="auto"
                  backgroundColor={
                    (boardPriorityMeta[displayedPriority]?.backgroundColor as any) ??
                    "$boardAccentSoft"
                  }
                  color={(boardPriorityMeta[displayedPriority]?.textColor as any) ?? "$boardAccent"}
                  hoverStyle={{ opacity: 0.92 }}
                  pressStyle={{ opacity: 0.86 }}
                  onMouseDown={priorityPress.onMouseDown}
                  onPress={() => setPriorityPickerOpen(true)}
                >
                  {(boardPriorityMeta[displayedPriority]?.shortLabel as string | undefined) ??
                    "Priority"}
                </BoardActionButton>
              </Popover.Anchor>

              <Popover.Content
                elevate
                padding="$3"
                borderRadius="$6"
                borderWidth={1}
                borderColor="$boardShellBorder"
                backgroundColor="$boardShellSurface"
                gap="$2"
                width={220}
                zIndex={1000}
              >
                <Popover.Arrow borderWidth={1} borderColor="$boardShellBorder" />
                <YStack gap="$2">
                  <Text fontSize="$3" fontWeight="700" color="$boardHeading">
                    Priority
                  </Text>
                  <YStack gap="$2">
                    {boardPriorityValues.map((priority) => {
                      const meta = boardPriorityMeta[priority];
                      const selected = priority === displayedPriority;
                      return (
                        <BoardActionButton
                          key={priority}
                          tone={selected ? "accent" : "default"}
                          onPress={async () => {
                            // Stamp the local optimistic priority FIRST so the pill repaints
                            // before any await crosses the event loop or the popover closes.
                            setPendingPriority(priority);
                            setPriorityPickerOpen(false);
                            if (priority === card.priority) {
                              setPendingPriority(null);
                              return;
                            }
                            try {
                              await onRenameTitle({
                                cardId: card.id,
                                title: card.title,
                                description: card.description,
                                priority,
                                expectedVersion: card.version,
                              });
                            } catch {
                              setPendingPriority(null);
                            }
                          }}
                        >
                          {meta.label}
                        </BoardActionButton>
                      );
                    })}
                  </YStack>
                </YStack>
              </Popover.Content>
            </Popover>
          </Theme>
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

        <CardTagsRow
          attachedTags={card.tags}
          availableTags={availableTags}
          onAddTag={(name) => onAddTag({ cardId: card.id, name })}
          onDetachTag={(tagId) => onDetachTag({ cardId: card.id, tagId })}
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
  availableTags,
  onOpen,
  onMove,
  onAddTag,
  onDetachTag,
  onRenameTitle,
}: Readonly<{
  card: BoardLane["cards"][number];
  showColumnContext: boolean;
  canMove: boolean;
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onOpen: () => void;
  onMove: (cardId: string, direction: Direction) => void;
  onAddTag: CardInteriorProps["onAddTag"];
  onDetachTag: CardInteriorProps["onDetachTag"];
  onRenameTitle: CardInteriorProps["onRenameTitle"];
}>) {
  return (
    <BoardSurface padding="$4">
      <CardInterior
        card={card}
        showColumnContext={showColumnContext}
        canMove={canMove}
        availableTags={availableTags}
        onOpen={onOpen}
        onMove={onMove}
        onAddTag={onAddTag}
        onDetachTag={onDetachTag}
        onRenameTitle={onRenameTitle}
      />
    </BoardSurface>
  );
}
