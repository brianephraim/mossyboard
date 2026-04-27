import type { DraggableProvided } from "@hello-pangea/dnd";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { CSSProperties, ReactNode } from "react";
import { Virtuoso } from "react-virtuoso";

import type { BoardLane, CardPriority } from "../types";
import type { BoardKey } from "../useDualBoardDnd";
import { scopeId } from "../useDualBoardDnd";
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

  return (
    <Droppable
      droppableId={droppableId}
      type="CARD"
      mode="virtual"
      ignoreContainerClipping
      renderClone={(provided, _snapshot, rubric) => {
        const card = cardArray[rubric.source.index];
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
