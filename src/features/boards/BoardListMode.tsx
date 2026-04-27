import { XStack, YStack } from "@tamagui/stacks";

import type { CardListItem, CardPriority } from "./types";
import { BoardActionButton, BoardInlineNotice, BoardStateCard } from "./ui";
import { CardPreview } from "./BoardCanvas/CardInterior";
import type { CardTagsRowTag } from "./BoardCanvas/CardTagsRow";

type BoardListModeProps = Readonly<{
  listItems: ReadonlyArray<CardListItem>;
  isLoading: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  hasNextPage: boolean;
  onLoadMore: () => void;
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onOpenCard: (cardId: string) => void;
  onDeleteCard: (input: { cardId: string; expectedVersion: number }) => Promise<void>;
  onAddTag: (input: { cardId: string; name: string }) => Promise<void>;
  onDetachTag: (input: { cardId: string; tagId: string }) => Promise<void>;
  onRenameCardTitle: (input: {
    cardId: string;
    title: string;
    description: string;
    priority: CardPriority;
    expectedVersion: number;
  }) => Promise<void>;
}>;

export function BoardListMode({
  listItems,
  isLoading,
  isLoadingMore,
  errorMessage,
  hasNextPage,
  onLoadMore,
  availableTags,
  onOpenCard,
  onDeleteCard,
  onAddTag,
  onDetachTag,
  onRenameCardTitle,
}: BoardListModeProps) {
  if (isLoading) {
    return (
      <BoardStateCard
        title="Loading matching cards"
        description="We’re building the flat list view for the current board filters."
      />
    );
  }

  if (errorMessage && listItems.length === 0) {
    return (
      <BoardStateCard title="We couldn’t load the matching cards" description={errorMessage} />
    );
  }

  if (listItems.length === 0) {
    return (
      <BoardStateCard
        title="No matching cards"
        description="Adjust the active priority filters or switch back to board view to continue."
      />
    );
  }

  return (
    <YStack gap="$3">
      {errorMessage ? <BoardInlineNotice tone="warning" message={errorMessage} /> : null}
      {listItems.map((card) => {
        return (
          <CardPreview
            key={card.id}
            card={{
              id: card.id,
              columnId: card.columnId,
              title: card.title,
              description: card.description,
              priority: card.priority,
              position: card.position,
              version: card.version,
              tags: card.tags,
              originalColumnId: card.columnId,
              originalColumnTitle: card.columnTitle,
            }}
            showColumnContext
            canMove={false}
            availableTags={availableTags}
            onOpen={() => onOpenCard(card.id)}
            onDelete={() => onDeleteCard({ cardId: card.id, expectedVersion: card.version })}
            onMove={() => {
              // List view doesn't support moving cards (keyboard or drag). Board view owns reordering.
            }}
            onAddTag={onAddTag}
            onDetachTag={onDetachTag}
            onRenameTitle={onRenameCardTitle}
          />
        );
      })}

      {hasNextPage ? (
        <XStack alignItems="center">
          <BoardActionButton tone="accent" onPress={onLoadMore}>
            {isLoadingMore ? "Loading more…" : "Load more"}
          </BoardActionButton>
        </XStack>
      ) : null}
    </YStack>
  );
}
