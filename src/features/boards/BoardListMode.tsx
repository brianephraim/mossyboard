import { useState } from "react";
import { Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import type { CardPriority } from "./types";
import {
  BoardActionButton,
  BoardInlineNotice,
  BoardStateCard,
  BoardSurface,
  PriorityPill,
} from "./ui";

export type BoardListItem = {
  id: string;
  title: string;
  description: string;
  priority: CardPriority;
  columnTitle: string;
  version: number;
};

type BoardListModeProps = Readonly<{
  listItems: ReadonlyArray<BoardListItem>;
  isLoading: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onOpenCard: (cardId: string) => void;
  onDeleteCard: (input: { cardId: string; expectedVersion: number }) => Promise<void>;
}>;

export function BoardListMode({
  listItems,
  isLoading,
  isLoadingMore,
  errorMessage,
  hasNextPage,
  onLoadMore,
  onOpenCard,
  onDeleteCard,
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
      {listItems.map((card) => (
        <BoardListItemSurface
          key={card.id}
          card={card}
          onOpen={onOpenCard}
          onDelete={onDeleteCard}
        />
      ))}

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

function BoardListItemSurface({
  card,
  onOpen,
  onDelete,
}: Readonly<{
  card: BoardListItem;
  onOpen: (cardId: string) => void;
  onDelete: (input: { cardId: string; expectedVersion: number }) => Promise<void>;
}>) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <BoardSurface padding="$4">
      <YStack gap="$3">
        <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
          <YStack gap="$1" flex={1} minWidth={0}>
            <Text fontWeight="700" color="$boardHeading">
              {card.title}
            </Text>
            <Text color="$boardTextMuted">{card.columnTitle}</Text>
          </YStack>
          <PriorityPill priority={card.priority} />
        </XStack>
        <Text color="$boardTextMuted">
          {card.description || "No description yet. Open the card to add more detail."}
        </Text>
        <XStack gap="$2" flexWrap="wrap" alignItems="center">
          <BoardActionButton tone="ghost" onPress={() => onOpen(card.id)}>
            Open card
          </BoardActionButton>
          <BoardActionButton
            tone={confirmDelete ? "danger" : "ghost"}
            disabled={isDeleting}
            onPress={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              setIsDeleting(true);
              try {
                await onDelete({ cardId: card.id, expectedVersion: card.version });
              } finally {
                setIsDeleting(false);
                setConfirmDelete(false);
              }
            }}
            onBlur={() => {
              if (!isDeleting) {
                setConfirmDelete(false);
              }
            }}
          >
            {isDeleting ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete"}
          </BoardActionButton>
        </XStack>
      </YStack>
    </BoardSurface>
  );
}
