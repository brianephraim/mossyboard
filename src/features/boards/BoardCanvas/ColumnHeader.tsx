import type { DraggableProvided } from "@hello-pangea/dnd";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@tamagui/input";
import { Stack, Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { BoardActionButton, BoardPill } from "../ui";
import type { BoardLane } from "../types";
import { EdgeMoveButton } from "./EdgeMoveButton";
import { COLUMN_HEADER_MOVE_EDGE_SIZE_PX } from "./layout";
import { useEdgeHoverFocus } from "./useEdgeHoverFocus";

type ColumnHeaderProps = {
  lane: BoardLane;
  columnId: string;
  canMoveColumn: boolean;
  dragHandleProps?: DraggableProvided["dragHandleProps"];
  onMoveColumn: (columnId: string, direction: "left" | "right") => void;
  onRenameColumn: (input: {
    columnId: string;
    title: string;
    expectedVersion: number;
  }) => Promise<void>;
  renamePendingColumnId: string | null;
};

export function ColumnHeaderWithInlineRename({
  lane,
  columnId,
  canMoveColumn,
  dragHandleProps,
  onMoveColumn,
  onRenameColumn,
  renamePendingColumnId,
}: Readonly<ColumnHeaderProps>) {
  const version = lane.columnVersion ?? 0;
  const labelId = `column-title-${columnId}`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lane.title);
  const skipBlurSave = useRef(false);
  const { visible, onHoverChange, onFocus, onBlur } = useEdgeHoverFocus();

  useEffect(() => {
    setDraft(lane.title);
  }, [lane.title]);

  const saving = renamePendingColumnId === columnId;
  const blockActions = Boolean(renamePendingColumnId);
  const moveControlsVisible = canMoveColumn && !editing && visible;

  const cancel = () => {
    skipBlurSave.current = true;
    setDraft(lane.title);
    setEditing(false);
    window.setTimeout(() => {
      skipBlurSave.current = false;
    }, 0);
  };

  const commit = async () => {
    const next = draft.trim();
    if (!next) {
      return;
    }

    if (next === lane.title) {
      cancel();
      return;
    }

    try {
      await onRenameColumn({
        columnId,
        title: next,
        expectedVersion: version,
      });
      setEditing(false);
    } catch {
      /* BoardDetailScreen surfaces conflicts via board refetch. */
    }
  };

  return (
    <YStack gap="$2">
      <div {...(dragHandleProps ?? {})} style={{ width: "100%" }}>
        <YStack gap="$2" position="relative" onFocus={onFocus} onBlur={onBlur}>
          {canMoveColumn && !editing
            ? (["left", "right"] as const).map((direction) => (
                <EdgeMoveButton
                  key={direction}
                  direction={direction}
                  ariaLabel={`Move column ${direction}`}
                  visible={moveControlsVisible}
                  disabled={blockActions}
                  thickness={COLUMN_HEADER_MOVE_EDGE_SIZE_PX}
                  perpendicularOffset={0}
                  onPress={() => onMoveColumn(columnId, direction)}
                  onHoverChange={onHoverChange}
                />
              ))
            : null}
          <XStack alignItems="center" gap="$3" minWidth={0}>
            <Stack
              width={12}
              height={12}
              marginTop={4}
              borderRadius={9999}
              backgroundColor="$boardTextSubtle"
            />
            {editing ? (
              <YStack gap="$2" flex={1} minWidth={0}>
                <YStack tag="label" gap="$2" htmlFor={`${labelId}-field`}>
                  <Text id={labelId} fontWeight="600" color="$boardHeading">
                    Column title
                  </Text>
                  <Input
                    id={`${labelId}-field`}
                    value={draft}
                    onChange={(e) => {
                      const event = e as unknown as {
                        currentTarget?: { value?: string };
                        nativeEvent?: { text?: string };
                      };
                      setDraft(event.currentTarget?.value ?? event.nativeEvent?.text ?? "");
                    }}
                    disabled={saving}
                    autoFocus
                    aria-labelledby={labelId}
                    onBlur={() => {
                      if (skipBlurSave.current || saving) {
                        return;
                      }

                      void commit();
                    }}
                    onKeyDown={(e: { nativeEvent?: { key?: string }; key?: string }) => {
                      const key = e.key ?? e.nativeEvent?.key ?? "";
                      if (key === "Escape") {
                        cancel();
                      }

                      if (key === "Enter") {
                        void commit();
                      }
                    }}
                    backgroundColor="$boardPanelSurfaceStrong"
                    borderColor="$boardShellBorder"
                  />
                </YStack>
                <XStack gap="$2" flexWrap="wrap">
                  <BoardActionButton tone="accent" disabled={saving} onPress={() => void commit()}>
                    {saving ? "Saving…" : "Save"}
                  </BoardActionButton>
                  <BoardActionButton tone="ghost" disabled={saving} onPress={cancel}>
                    Cancel
                  </BoardActionButton>
                </XStack>
              </YStack>
            ) : (
              <XStack alignItems="center" gap="$3" minWidth={0} flex={1}>
                <Text
                  tag="h2"
                  fontWeight="800"
                  color="$boardHeading"
                  fontSize="$6"
                  numberOfLines={1}
                >
                  {lane.title}
                </Text>
                <BoardPill>{lane.cards.length}</BoardPill>
              </XStack>
            )}
          </XStack>

          {!editing ? (
            <XStack gap="$2" flexWrap="wrap">
              <BoardActionButton
                tone="ghost"
                disabled={blockActions}
                onPress={() => {
                  setDraft(lane.title);
                  setEditing(true);
                }}
              >
                Rename
              </BoardActionButton>
            </XStack>
          ) : null}
        </YStack>
      </div>
    </YStack>
  );
}
