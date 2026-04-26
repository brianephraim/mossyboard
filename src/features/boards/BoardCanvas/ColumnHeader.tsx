import type { DraggableProvided } from "@hello-pangea/dnd";
import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Stack, Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { FormInlineTextField } from "../../../form";
import { BoardPill } from "../ui";
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
  const form = useForm<{ title: string }>({
    defaultValues: { title: lane.title },
  });
  const { visible, onHoverChange, onFocus, onBlur } = useEdgeHoverFocus();

  useEffect(() => {
    form.reset({ title: lane.title });
  }, [form, lane.title]);

  const saving = renamePendingColumnId === columnId;
  const blockActions = Boolean(renamePendingColumnId);
  const moveControlsVisible = canMoveColumn && visible;
  const submit = form.handleSubmit(async (values) => {
    if (saving) {
      return;
    }
    const next = values.title.trim();
    if (!next) {
      form.reset({ title: lane.title });
      return;
    }
    if (next === lane.title) {
      return;
    }
    await onRenameColumn({
      columnId,
      title: next,
      expectedVersion: version,
    });
  });

  return (
    <YStack gap="$2">
      <div {...(dragHandleProps ?? {})} style={{ width: "100%" }}>
        <YStack gap="$2" position="relative" onFocus={onFocus} onBlur={onBlur}>
          {canMoveColumn
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
            <FormProvider {...form}>
              <XStack alignItems="center" gap="$3" minWidth={0} flex={1}>
                <FormInlineTextField<{ title: string }, "title">
                  name="title"
                  aria-label="Column title"
                  defaultValue={lane.title}
                  disabled={blockActions}
                  focusOnMouseUp
                  onBlur={() => {
                    if (blockActions) return;
                    void submit();
                  }}
                  onKeyDown={(event: { key?: string; nativeEvent?: { key?: string } }) => {
                    const key = event.key ?? event.nativeEvent?.key ?? "";
                    if (key === "Enter") {
                      void submit();
                    }
                  }}
                  width="auto"
                  maxWidth="100%"
                  flexGrow={1}
                  flexShrink={1}
                  minWidth={0}
                  color="$boardHeading"
                  fontSize="$6"
                  fontWeight="800"
                  borderWidth={1}
                  borderRadius="$4"
                  borderColor="transparent"
                  backgroundColor="transparent"
                  boxShadow="transparent 0px 0px 0px 0px"
                  paddingHorizontal={0}
                  paddingVertical={0}
                  focusStyle={{ outlineWidth: 0 }}
                  focusVisibleStyle={{
                    outlineWidth: 0,
                    backgroundColor: "$boardPanelSurfaceStrong",
                    borderColor: "$boardAccent",
                    boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
                  }}
                />
                <BoardPill>{lane.cards.length}</BoardPill>
              </XStack>
            </FormProvider>
          </XStack>
        </YStack>
      </div>
    </YStack>
  );
}
