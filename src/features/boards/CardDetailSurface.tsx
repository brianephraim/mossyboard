import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { FormOptionButtonsField, FormRoot, FormTextAreaField, FormTextField } from "../../form";
import { PrettyModalWrap } from "../../Modal/PrettyModalWrap";
import { trpc } from "../../trpc/client";
import { CardTagsRow } from "./BoardCanvas/CardTagsRow";
import { boardPriorityMeta, boardPriorityValues } from "./model";
import type { CardPriority } from "./types";
import { BoardActionButton, BoardInlineNotice, BoardPill, BoardSurface } from "./ui";
import { useTagMutations } from "./useTagMutations";

type CardDetailForm = {
  title: string;
  description: string;
  priority: CardPriority;
};

type CardDetailSurfaceProps = {
  open: boolean;
  cardId?: string;
  boardId: string;
  candidateBoardIds?: string[];
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  onBoardChanged: () => Promise<void>;
  onAnnounce: (message: string) => void;
};

export function CardDetailSurface({
  open,
  cardId,
  boardId,
  candidateBoardIds,
  onOpenChange,
  onDeleted,
  onBoardChanged,
  onAnnounce,
}: Readonly<CardDetailSurfaceProps>) {
  const utils = trpc.useUtils();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resolvedBoardId, setResolvedBoardId] = useState<string>(boardId);
  useEffect(() => {
    if (!open || !cardId) {
      setResolvedBoardId(boardId);
      return;
    }
    setResolvedBoardId(boardId);
  }, [boardId, cardId, open]);

  const cardQuery = trpc.card.get.useQuery(
    {
      cardId: cardId ?? "00000000-0000-0000-0000-000000000000",
      boardId: resolvedBoardId,
    },
    {
      enabled: open && Boolean(cardId),
      retry: false,
    },
  );

  const tagListQuery = trpc.tag.list.useQuery({});
  const availableTags = tagListQuery.data ?? [];
  const { addTag, detachTag } = useTagMutations({
    boardId: resolvedBoardId,
    onAnnounce,
  });

  useEffect(() => {
    if (!open || !cardId || !cardQuery.isError) {
      return;
    }
    const candidates = (candidateBoardIds ?? []).filter(Boolean);
    if (candidates.length === 0) {
      return;
    }
    const message = (cardQuery.error as { message?: string }).message ?? "";
    const looksNotFound = message.toLowerCase().includes("not found");
    if (!looksNotFound) {
      return;
    }
    const currentIndex = candidates.indexOf(resolvedBoardId);
    const next = candidates[currentIndex + 1];
    if (next && next !== resolvedBoardId) {
      setResolvedBoardId(next);
    }
  }, [candidateBoardIds, cardId, cardQuery.error, cardQuery.isError, open, resolvedBoardId]);
  const form = useForm<CardDetailForm>({
    defaultValues: {
      title: "",
      description: "",
      priority: "none",
    },
  });

  useEffect(() => {
    if (!cardQuery.data?.card) {
      return;
    }

    form.reset({
      title: cardQuery.data.card.title,
      description: cardQuery.data.card.description,
      priority: cardQuery.data.card.priority,
    });
    setConfirmDelete(false);
  }, [cardQuery.data?.card, form]);

  const updateCard = trpc.card.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        cardQuery.refetch(),
        onBoardChanged(),
        utils.card.listByBoard.invalidate({ boardId: resolvedBoardId }),
      ]);
      onAnnounce("Card saved.");
    },
  });

  const deleteCard = trpc.card.softDelete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        onBoardChanged(),
        utils.card.listByBoard.invalidate({ boardId: resolvedBoardId }),
      ]);
      onAnnounce("Card deleted.");
      onDeleted();
    },
  });

  if (cardQuery.isLoading && !cardQuery.data) {
    return (
      <PrettyModalWrap
        open={open}
        onOpenChange={onOpenChange}
        title="Card details"
        description="Edit title, description, priority, and tags from this surface."
        footer={null}
        desktopPlacement="side"
        desktopWidth={580}
        fullScreenOnMobile
      >
        <BoardSurface padding="$4">
          <Text color="$boardTextMuted">Loading card details…</Text>
        </BoardSurface>
      </PrettyModalWrap>
    );
  }

  if (cardQuery.error && !cardQuery.data) {
    return (
      <PrettyModalWrap
        open={open}
        onOpenChange={onOpenChange}
        title="Card details"
        description="Edit title, description, priority, and tags from this surface."
        footer={null}
        desktopPlacement="side"
        desktopWidth={580}
        fullScreenOnMobile
      >
        <BoardSurface padding="$4">
          <YStack gap="$3">
            <Text fontWeight="700" color="$boardHeading">
              This card is not available
            </Text>
            <Text color="$boardTextMuted">
              The selected card may have been deleted or no longer belongs to this board.
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              <BoardActionButton tone="ghost" onPress={() => onOpenChange(false)}>
                Close
              </BoardActionButton>
              <BoardActionButton onPress={() => void cardQuery.refetch()}>Retry</BoardActionButton>
            </XStack>
          </YStack>
        </BoardSurface>
      </PrettyModalWrap>
    );
  }

  const card = cardQuery.data?.card;

  if (!card) {
    return null;
  }

  return (
    <PrettyModalWrap
      open={open}
      onOpenChange={onOpenChange}
      title={cardQuery.data?.card.title ?? "Card details"}
      description="Edit title, description, priority, and tags from this surface."
      footer={null}
      desktopPlacement="side"
      desktopWidth={580}
      fullScreenOnMobile
    >
      <YStack gap="$4">
        {updateCard.error ? (
          <BoardInlineNotice tone="danger" message={updateCard.error.message} />
        ) : null}

        <BoardSurface padding="$4">
          <FormRoot
            form={form}
            gap="$3"
            onSubmit={async (values) => {
              await updateCard.mutateAsync({
                cardId: card.id,
                title: values.title,
                description: values.description,
                priority: values.priority,
                expectedVersion: card.version,
              });
            }}
          >
            <FormTextField<CardDetailForm, "title">
              name="title"
              label="Title"
              rules={{
                required: "Title is required.",
                minLength: { value: 1, message: "Title is required." },
                maxLength: { value: 200, message: "Keep the title under 200 characters." },
              }}
              fieldProps={{ gap: "$2" }}
              labelProps={{ fontWeight: "700", color: "$boardHeading" }}
              backgroundColor="$boardPanelSurfaceStrong"
              defaultBorderColor="$boardShellBorder"
            />

            <FormTextAreaField<CardDetailForm, "description">
              name="description"
              label="Description"
              fieldProps={{ gap: "$2" }}
              labelProps={{ fontWeight: "700", color: "$boardHeading" }}
              numberOfLines={8}
              minHeight={180}
              backgroundColor="$boardPanelSurfaceStrong"
              defaultBorderColor="$boardShellBorder"
            />

            <FormOptionButtonsField<CardDetailForm, "priority", CardPriority>
              name="priority"
              label="Priority"
              fieldProps={{ gap: "$2" }}
              labelProps={{ fontWeight: "700", color: "$boardHeading" }}
              options={boardPriorityValues.map((priority) => ({
                label: boardPriorityMeta[priority].label,
                value: priority,
              }))}
              optionsProps={{ gap: "$2", flexWrap: "wrap" }}
              renderOption={({ buttonProps, option, selected }) => {
                const meta = boardPriorityMeta[option.value];

                return (
                  <BoardActionButton
                    {...buttonProps}
                    key={option.value}
                    tone={selected ? "accent" : "ghost"}
                    backgroundColor={selected ? (meta.accentColor as any) : undefined}
                  >
                    {option.label}
                  </BoardActionButton>
                );
              }}
            />

            <XStack gap="$2" flexWrap="wrap">
              <BoardPill>{card.columnTitle}</BoardPill>
            </XStack>

            <XStack gap="$3" flexWrap="wrap">
              <BoardActionButton
                type="submit"
                tone="accent"
                disabled={!form.formState.isDirty || updateCard.isPending}
              >
                {updateCard.isPending ? "Saving…" : "Save card"}
              </BoardActionButton>
              <BoardActionButton
                tone="ghost"
                disabled={!form.formState.isDirty}
                onPress={() => {
                  form.reset({
                    title: card.title,
                    description: card.description,
                    priority: card.priority,
                  });
                }}
              >
                Discard changes
              </BoardActionButton>
              <BoardActionButton
                tone={confirmDelete ? "danger" : "ghost"}
                onPress={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }

                  void deleteCard.mutateAsync({
                    cardId: card.id,
                    expectedVersion: card.version,
                  });
                }}
              >
                {deleteCard.isPending
                  ? "Deleting…"
                  : confirmDelete
                    ? "Confirm delete"
                    : "Delete card"}
              </BoardActionButton>
            </XStack>
          </FormRoot>
        </BoardSurface>

        <BoardSurface padding="$4">
          <YStack gap="$3">
            <Text fontWeight="700" color="$boardHeading">
              Tags
            </Text>
            <CardTagsRow
              attachedTags={card.tags}
              availableTags={availableTags}
              onAddTag={(name) => addTag({ cardId: card.id, name })}
              onDetachTag={(tagId) => detachTag({ cardId: card.id, tagId })}
            />
          </YStack>
        </BoardSurface>
      </YStack>
    </PrettyModalWrap>
  );
}
