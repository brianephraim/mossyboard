import type { DraggableProvided } from "@hello-pangea/dnd";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { ItemProps } from "react-virtuoso";
import { Virtuoso } from "react-virtuoso";

import type { BoardLane, CardPriority } from "../types";
import type { BoardKey } from "../useDualBoardDnd";
import { parseScopedId, scopeId } from "../useDualBoardDnd";
import { CardInterior } from "./CardInterior";
import type { CardTagsRowTag } from "./CardTagsRow";
import { dndCardListStyle, dndCardShellStyle, mergeDraggableStyle } from "./layout";

type Direction = "up" | "down" | "left" | "right";

type CardItem = BoardLane["cards"][number];

type Props = {
  /** Unscoped column id (for keying); scoping is applied via `dndScopeKey`. */
  columnId: string;
  cards: ReadonlyArray<CardItem>;
  hasNextPage: boolean;
  onLoadMore: () => void;
  bottomScrollPadding?: number;
  dndScopeKey?: BoardKey;
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onOpenCard: (cardId: string) => void;
  onMoveCard: (cardId: string, direction: Direction) => void;
  onAddTag: (input: { cardId: string; name: string }) => Promise<void>;
  onDetachTag: (input: { cardId: string; tagId: string }) => Promise<void>;
  onRenameCardTitle: (input: {
    cardId: string;
    title: string;
    description: string;
    priority: CardPriority;
    expectedVersion: number;
  }) => Promise<void>;
};

const VIRTUOSO_STYLE: CSSProperties = {
  ...dndCardListStyle,
  flex: "1 1 auto",
  minHeight: 0,
};

// Virtuoso lays items out by stacking — an item that goes `position: fixed`
// (which is what `@hello-pangea/dnd` does to the dragged Draggable on drag
// start) collapses its slot to height 0, and every item below it snaps
// upward in a single un-animated reflow. This wrapper, lifted from
// Virtuoso's official `@hello-pangea/dnd` recipe, remembers the last
// non-zero rendered height of each item so the slot stays put while the
// inner content is removed from flow.
//
// `display: flow-root` establishes a new block formatting context so the
// inner card shell's `marginBottom` (which provides the inter-card gap) is
// contained inside this wrapper's measured `getBoundingClientRect()` height
// — i.e. Virtuoso's `data-known-size` includes the gap, and our retained
// `min-height` does too. We deliberately keep that gap on the Draggable
// shell as `marginBottom` (instead of moving it into the wrapper) so
// `@hello-pangea/dnd`'s sibling-displacement math, which sums each
// Draggable's border-box height **plus** computed margins, shifts the
// neighbouring card by the full slot distance when this card lifts out.
function HeightPreservingItem({ children, style, item: _item, ...rest }: ItemProps<CardItem>) {
  const knownSize = rest["data-known-size"];
  const [size, setSize] = useState(0);
  useEffect(() => {
    if (typeof knownSize === "number" && knownSize > 0) {
      setSize(knownSize);
    }
  }, [knownSize]);
  return (
    <div
      {...rest}
      style={{
        ...style,
        display: "flow-root",
        minHeight: size > 0 ? `${size}px` : undefined,
      }}
    >
      {children}
    </div>
  );
}

export function VirtualizedCardList({
  columnId,
  cards,
  hasNextPage,
  onLoadMore,
  bottomScrollPadding,
  dndScopeKey,
  availableTags,
  onOpenCard,
  onMoveCard,
  onAddTag,
  onDetachTag,
  onRenameCardTitle,
}: Readonly<Props>) {
  const scoped = (id: string) => (dndScopeKey ? scopeId(dndScopeKey, id) : id);
  const droppableId = scoped(columnId);
  const cardArray = cards as ReadonlyArray<CardItem>;

  // Keep a stable id→card map so `renderClone` can always resolve the dragged
  // card — including during the drop animation that follows a programmatic
  // (edge-button) drag. With our synchronous TanStack Query notifier, the
  // optimistic patch reorders (or, for cross-column moves, removes) the card
  // from `cardArray` before hello-pangea calls `renderClone(rubric)`. Looking
  // up by `rubric.source.index` would then return the wrong card or
  // `undefined`, which is what made the moved card "teleport" into the new
  // slot instead of riding the drop animation.
  //
  // We accumulate (never delete) so a card that was removed from this column
  // by a cross-column patch is still resolvable while its drop animation
  // plays out from this Droppable's clone.
  const cardByIdRef = useRef<Map<string, CardItem>>(new Map());
  for (const card of cardArray) {
    cardByIdRef.current.set(card.id, card);
  }

  return (
    <Droppable
      droppableId={droppableId}
      type="CARD"
      mode="virtual"
      ignoreContainerClipping
      renderClone={(provided, _snapshot, rubric) => {
        const unscoped = parseScopedId(rubric.draggableId);
        const cardId = unscoped ? unscoped.id : rubric.draggableId;
        const card = cardByIdRef.current.get(cardId) ?? cardArray[rubric.source.index];
        if (!card) {
          return <div ref={provided.innerRef} {...provided.draggableProps} />;
        }
        return renderDraggableShell(provided, () => (
          <CardInterior
            card={card}
            showColumnContext={false}
            canMove
            dragHandleProps={provided.dragHandleProps}
            availableTags={availableTags}
            onOpen={() => onOpenCard(card.id)}
            onMove={onMoveCard}
            onAddTag={onAddTag}
            onDetachTag={onDetachTag}
            onRenameTitle={onRenameCardTitle}
          />
        ));
      }}
    >
      {(provided) => (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            minHeight: 0,
            paddingLeft: "var(--c-space-4)",
            paddingRight: "var(--c-space-4)",
            paddingTop: "var(--c-space-3)",
            paddingBottom: bottomScrollPadding ?? undefined,
          }}
        >
          <Virtuoso
            scrollerRef={(ref) => {
              if (typeof provided.innerRef === "function") {
                provided.innerRef(ref as HTMLElement | null);
              }
            }}
            data={cardArray as CardItem[]}
            style={VIRTUOSO_STYLE}
            increaseViewportBy={400}
            endReached={() => {
              if (hasNextPage) {
                onLoadMore();
              }
            }}
            itemContent={(index, card) => (
              <Draggable
                key={card.id}
                draggableId={scoped(card.id)}
                index={index}
                disableInteractiveElementBlocking
              >
                {(cardProvided) =>
                  renderDraggableShell(cardProvided, () => (
                    <CardInterior
                      card={card}
                      showColumnContext={false}
                      canMove
                      dragHandleProps={cardProvided.dragHandleProps}
                      availableTags={availableTags}
                      onOpen={() => onOpenCard(card.id)}
                      onMove={onMoveCard}
                      onAddTag={onAddTag}
                      onDetachTag={onDetachTag}
                      onRenameTitle={onRenameCardTitle}
                    />
                  ))
                }
              </Draggable>
            )}
            components={{
              Item: HeightPreservingItem,
              Footer: () => (provided.placeholder ?? null) as ReactNode,
            }}
          />
        </div>
      )}
    </Droppable>
  );
}

function renderDraggableShell(provided: DraggableProvided, children: () => ReactNode) {
  const { rest, style } = mergeDraggableStyle(dndCardShellStyle, provided.draggableProps);
  return (
    <div ref={provided.innerRef} {...rest} style={style}>
      {children()}
    </div>
  );
}
