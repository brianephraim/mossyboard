import type { DraggableProvided, DropResult, Sensor } from "@hello-pangea/dnd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { ReactNode } from "react";
import { XStack, YStack } from "@tamagui/stacks";

import type { BoardLane } from "../types";
import type { BoardKey } from "../useDualBoardDnd";
import { scopeId } from "../useDualBoardDnd";
import { InsertColumnCircleButton } from "./InsertColumnCircleButton";
import {
  BOARD_DND_GAP_PX,
  COLUMN_WIDTH_PX,
  INSERT_COLUMN_BUTTON_OFFSET_PX,
  INSERT_COLUMN_BUTTON_SAFE_TOP_PX,
  columnPlaceholder,
  dndColumnShellStyle,
  dndHorizontalRowStyle,
  mergeDraggableStyle,
} from "./layout";

type RenderLane = (
  lane: BoardLane,
  laneIndex: number,
  dragHandleProps?: DraggableProvided["dragHandleProps"],
) => ReactNode;

type BoardColumnsLayoutProps = {
  lanes: BoardLane[];
  enableColumnDnD: boolean;
  dragSensors?: Sensor[];
  onDragEnd: (result: DropResult) => void;
  onOpenCreateColumnAfter: (columnId?: string | null) => void;
  renderLane: RenderLane;
  dndScopeKey?: BoardKey;
  wrapDragDropContext?: boolean;
};

export function BoardColumnsLayout({
  lanes,
  enableColumnDnD,
  dragSensors,
  onDragEnd,
  onOpenCreateColumnAfter,
  renderLane,
  dndScopeKey,
  wrapDragDropContext = true,
}: Readonly<BoardColumnsLayoutProps>) {
  const totalLanes = lanes.length;
  const scoped = (id: string) => (dndScopeKey ? scopeId(dndScopeKey, id) : id);

  if (enableColumnDnD) {
    const content = (
      <Droppable
        droppableId={scoped("board-columns")}
        direction="horizontal"
        type="COLUMN"
        ignoreContainerClipping
      >
        {(provided) => (
          <div
            style={{
              ...dndHorizontalRowStyle,
              paddingLeft: "var(--c-space-5)",
              paddingRight: "var(--c-space-5)",
              paddingTop: INSERT_COLUMN_BUTTON_SAFE_TOP_PX,
              paddingBottom: "var(--c-space-5)",
              marginRight: -BOARD_DND_GAP_PX,
            }}
          >
            <div style={dndHorizontalRowStyle}>
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ ...dndHorizontalRowStyle, marginRight: -BOARD_DND_GAP_PX }}
              >
                {totalLanes === 0 ? (
                  <EmptyBoardSlot onOpenCreateColumnAfter={onOpenCreateColumnAfter} />
                ) : null}

                {lanes.map((lane, laneIndex) => (
                  <Draggable
                    key={lane.id}
                    draggableId={scoped(lane.id)}
                    index={laneIndex}
                    disableInteractiveElementBlocking
                  >
                    {(columnProvided) => {
                      const { rest: colDragRest, style: colDragStyle } = mergeDraggableStyle(
                        dndColumnShellStyle,
                        columnProvided.draggableProps,
                      );
                      return (
                        <div
                          ref={columnProvided.innerRef}
                          {...colDragRest}
                          style={{ position: "relative", ...colDragStyle }}
                        >
                          <InsertColumnEdgeButtons
                            laneId={lane.id}
                            laneIndex={laneIndex}
                            totalLanes={totalLanes}
                            onOpenCreateColumnAfter={onOpenCreateColumnAfter}
                          />
                          {renderLane(lane, laneIndex, columnProvided.dragHandleProps)}
                        </div>
                      );
                    }}
                  </Draggable>
                ))}
                {columnPlaceholder(provided.placeholder)}
              </div>
            </div>
          </div>
        )}
      </Droppable>
    );
    return wrapDragDropContext ? (
      <DragDropContext onDragEnd={onDragEnd} sensors={dragSensors}>
        {content}
      </DragDropContext>
    ) : (
      content
    );
  }

  const staticContent = (
    <XStack
      gap="$4"
      alignItems="stretch"
      height="100%"
      minWidth="max-content"
      paddingHorizontal="$5"
      paddingTop={INSERT_COLUMN_BUTTON_SAFE_TOP_PX}
      paddingBottom="$5"
    >
      {totalLanes === 0 ? (
        <EmptyBoardSlot onOpenCreateColumnAfter={onOpenCreateColumnAfter} />
      ) : null}

      {lanes.map((lane, laneIndex) => (
        <YStack
          key={lane.id}
          width={COLUMN_WIDTH_PX}
          minWidth={COLUMN_WIDTH_PX}
          height="100%"
          flexShrink={0}
          position="relative"
        >
          <InsertColumnEdgeButtons
            laneId={lane.id}
            laneIndex={laneIndex}
            totalLanes={totalLanes}
            onOpenCreateColumnAfter={onOpenCreateColumnAfter}
          />
          {renderLane(lane, laneIndex)}
        </YStack>
      ))}
    </XStack>
  );

  if (wrapDragDropContext && dragSensors) {
    return (
      <DragDropContext onDragEnd={onDragEnd} sensors={dragSensors}>
        {staticContent}
      </DragDropContext>
    );
  }

  return staticContent;
}

function EmptyBoardSlot({
  onOpenCreateColumnAfter,
}: Readonly<{
  onOpenCreateColumnAfter: (columnId?: string | null) => void;
}>) {
  return (
    <YStack width={COLUMN_WIDTH_PX} minWidth={COLUMN_WIDTH_PX} padding="$5">
      <InsertColumnCircleButton
        ariaLabel="Add first column"
        onPress={() => onOpenCreateColumnAfter(null)}
      />
    </YStack>
  );
}

function InsertColumnEdgeButtons({
  laneId,
  laneIndex,
  totalLanes,
  onOpenCreateColumnAfter,
}: Readonly<{
  laneId: string;
  laneIndex: number;
  totalLanes: number;
  onOpenCreateColumnAfter: (columnId?: string | null) => void;
}>) {
  const isLast = laneIndex === totalLanes - 1;
  return (
    <>
      {laneIndex === 0 ? (
        <YStack position="absolute" left={-INSERT_COLUMN_BUTTON_OFFSET_PX} top={6} zIndex={2}>
          <InsertColumnCircleButton
            ariaLabel="Add column before first column"
            onPress={() => onOpenCreateColumnAfter(null)}
          />
        </YStack>
      ) : null}

      <YStack position="absolute" right={-INSERT_COLUMN_BUTTON_OFFSET_PX} top={6} zIndex={2}>
        <InsertColumnCircleButton
          ariaLabel={isLast ? "Add column after last column" : "Add column between columns"}
          onPress={() => onOpenCreateColumnAfter(laneId)}
        />
      </YStack>
    </>
  );
}
