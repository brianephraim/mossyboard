import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Checkbox } from "@tamagui/checkbox";
import { Input } from "@tamagui/input";
import { Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { FormOptionButtonsField, FormRoot, FormTextAreaField, FormTextField } from "../../form";
import { PrettyModalWrap } from "../../Modal/PrettyModalWrap";
import { tamaguiInputValueOnChange } from "../../tamaguiRhfWebField";
import { trpc } from "../../trpc/client";
import { boardPriorityMeta, boardPriorityValues } from "./model";
import type { CardPriority } from "./types";
import { BoardActionButton, BoardInlineNotice, BoardPill, BoardSurface } from "./ui";

type CardDetailForm = {
  title: string;
  description: string;
  priority: CardPriority;
};

type CardDetailSurfaceProps = {
  open: boolean;
  cardId?: string;
  boardId: string;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  onBoardChanged: () => Promise<void>;
  onAnnounce: (message: string) => void;
};

export function CardDetailSurface({
  open,
  cardId,
  boardId,
  onOpenChange,
  onDeleted,
  onBoardChanged,
  onAnnounce,
}: Readonly<CardDetailSurfaceProps>) {
  const utils = trpc.useUtils();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const cardQuery = trpc.card.get.useQuery(
    {
      cardId: cardId ?? "00000000-0000-0000-0000-000000000000",
      boardId,
    },
    {
      enabled: open && Boolean(cardId),
      retry: false,
    },
  );
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
        utils.card.listByBoard.invalidate({ boardId }),
      ]);
      onAnnounce("Card saved.");
    },
  });

  const deleteCard = trpc.card.softDelete.useMutation({
    onSuccess: async () => {
      await Promise.all([onBoardChanged(), utils.card.listByBoard.invalidate({ boardId })]);
      onAnnounce("Card deleted.");
      onDeleted();
    },
  });

  const createSubtask = trpc.subtask.create.useMutation({
    onSuccess: async () => {
      setNewSubtaskTitle("");
      await Promise.all([cardQuery.refetch(), onBoardChanged()]);
      onAnnounce("Subtask added.");
    },
  });

  const updateSubtask = trpc.subtask.update.useMutation({
    onSuccess: async () => {
      setEditingSubtaskId(null);
      setEditingSubtaskTitle("");
      await Promise.all([cardQuery.refetch(), onBoardChanged()]);
      onAnnounce("Subtask saved.");
    },
  });

  const toggleSubtask = trpc.subtask.toggle.useMutation({
    onSuccess: async () => {
      await Promise.all([cardQuery.refetch(), onBoardChanged()]);
      onAnnounce("Subtask updated.");
    },
  });

  const deleteSubtask = trpc.subtask.softDelete.useMutation({
    onSuccess: async () => {
      await Promise.all([cardQuery.refetch(), onBoardChanged()]);
      onAnnounce("Subtask removed.");
    },
  });

  if (cardQuery.isLoading && !cardQuery.data) {
    return (
      <PrettyModalWrap
        open={open}
        onOpenChange={onOpenChange}
        title="Card details"
        description="Edit title, description, priority, and subtasks from this surface."
        footer={null}
        desktopPlacement="side"
        desktopWidth="min(580px, 100vw)"
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
        description="Edit title, description, priority, and subtasks from this surface."
        footer={null}
        desktopPlacement="side"
        desktopWidth="min(580px, 100vw)"
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

  const completedCount = card.subtasks.filter((subtask) => subtask.isDone).length;

  return (
    <PrettyModalWrap
      open={open}
      onOpenChange={onOpenChange}
      title={cardQuery.data?.card.title ?? "Card details"}
      description="Edit title, description, priority, and subtasks from this surface."
      footer={null}
      desktopPlacement="side"
      desktopWidth="min(580px, 100vw)"
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
                    backgroundColor={selected ? meta.accentColor : undefined}
                  >
                    {option.label}
                  </BoardActionButton>
                );
              }}
            />

            <XStack gap="$2" flexWrap="wrap">
              <BoardPill>{card.columnTitle}</BoardPill>
              <BoardPill>{completedCount} complete subtasks</BoardPill>
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
            <XStack alignItems="center" justifyContent="space-between" gap="$3" flexWrap="wrap">
              <YStack gap="$1">
                <Text fontWeight="700" color="$boardHeading">
                  Subtasks
                </Text>
                <Text color="$boardTextMuted">
                  {completedCount} of {card.subtasks.length} complete
                </Text>
              </YStack>
              <BoardPill>{card.subtasks.length}</BoardPill>
            </XStack>

            <XStack gap="$2" flexWrap="wrap">
              <Input
                value={newSubtaskTitle}
                onChange={tamaguiInputValueOnChange(setNewSubtaskTitle)}
                placeholder="Add a subtask"
                flex={1}
                minWidth={220}
                backgroundColor="$boardPanelSurfaceStrong"
                borderColor="$boardShellBorder"
              />
              <BoardActionButton
                tone="accent"
                disabled={newSubtaskTitle.trim().length === 0 || createSubtask.isPending}
                onPress={() => {
                  void createSubtask.mutateAsync({
                    cardId: card.id,
                    title: newSubtaskTitle.trim(),
                  });
                }}
              >
                Add subtask
              </BoardActionButton>
            </XStack>

            <YStack gap="$3">
              {card.subtasks.length === 0 ? (
                <Text color="$boardTextMuted">
                  No subtasks yet. Add one to start breaking the work down.
                </Text>
              ) : (
                card.subtasks.map((subtask) => {
                  const isEditing = editingSubtaskId === subtask.id;

                  return (
                    <BoardSurface key={subtask.id} padding="$3">
                      <YStack gap="$3">
                        <XStack gap="$3" alignItems="center">
                          <Checkbox
                            checked={subtask.isDone}
                            size="$3"
                            onCheckedChange={(checked) => {
                              void toggleSubtask.mutateAsync({
                                subtaskId: subtask.id,
                                isDone: checked === true,
                                expectedVersion: subtask.version,
                              });
                            }}
                          >
                            <Checkbox.Indicator>
                              <Text fontWeight="800">✓</Text>
                            </Checkbox.Indicator>
                          </Checkbox>

                          {isEditing ? (
                            <Input
                              value={editingSubtaskTitle}
                              onChange={tamaguiInputValueOnChange(setEditingSubtaskTitle)}
                              flex={1}
                              autoFocus
                              backgroundColor="$boardPanelSurfaceStrong"
                              borderColor="$boardShellBorder"
                            />
                          ) : (
                            <Text
                              flex={1}
                              color="$boardHeading"
                              textDecorationLine={subtask.isDone ? "line-through" : "none"}
                            >
                              {subtask.title}
                            </Text>
                          )}
                        </XStack>

                        <XStack gap="$2" flexWrap="wrap">
                          {isEditing ? (
                            <>
                              <BoardActionButton
                                tone="accent"
                                disabled={
                                  editingSubtaskTitle.trim().length === 0 || updateSubtask.isPending
                                }
                                onPress={() => {
                                  void updateSubtask.mutateAsync({
                                    subtaskId: subtask.id,
                                    title: editingSubtaskTitle.trim(),
                                    expectedVersion: subtask.version,
                                  });
                                }}
                              >
                                Save
                              </BoardActionButton>
                              <BoardActionButton
                                tone="ghost"
                                onPress={() => {
                                  setEditingSubtaskId(null);
                                  setEditingSubtaskTitle("");
                                }}
                              >
                                Cancel
                              </BoardActionButton>
                            </>
                          ) : (
                            <BoardActionButton
                              tone="ghost"
                              onPress={() => {
                                setEditingSubtaskId(subtask.id);
                                setEditingSubtaskTitle(subtask.title);
                              }}
                            >
                              Edit
                            </BoardActionButton>
                          )}
                          <BoardActionButton
                            tone="ghost"
                            onPress={() => {
                              void deleteSubtask.mutateAsync({
                                subtaskId: subtask.id,
                                expectedVersion: subtask.version,
                              });
                            }}
                          >
                            Delete
                          </BoardActionButton>
                        </XStack>
                      </YStack>
                    </BoardSurface>
                  );
                })
              )}
            </YStack>
          </YStack>
        </BoardSurface>
      </YStack>
    </PrettyModalWrap>
  );
}
