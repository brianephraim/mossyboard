import type { DraggableProvided } from "@hello-pangea/dnd";
import { Stack } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { FormInlineRenameField } from "../../../form";
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
  const { visible, onHoverChange, onFocus, onBlur } = useEdgeHoverFocus();

  const blockActions = Boolean(renamePendingColumnId);
  const moveControlsVisible = canMoveColumn && visible;

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
            <XStack alignItems="center" gap="$3" minWidth={0} flex={1}>
              <FormInlineRenameField
                ariaLabel="Column title"
                defaultValue={lane.title}
                disabled={blockActions}
                focusOnMouseUp
                onSubmitTitle={async (nextTitle) => {
                  await onRenameColumn({
                    columnId,
                    title: nextTitle,
                    expectedVersion: version,
                  });
                }}
                inputProps={{
                  width: "auto",
                  maxWidth: "100%",
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 0,
                  color: "$boardHeading",
                  fontSize: "$6",
                  fontWeight: "800",
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
              <BoardPill>{lane.cards.length}</BoardPill>
            </XStack>
          </XStack>
        </YStack>
      </div>
    </YStack>
  );
}
