import type { DraggableProvided } from "@hello-pangea/dnd";
import {
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

export const BOARD_DND_GAP_PX = 16;
export const COLUMN_WIDTH_PX = 320;
export const INSERT_COLUMN_BUTTON_SIZE_PX = 26;
export const CARD_MOVE_EDGE_SIZE_PX = 15;
export const CARD_CHROME_PADDING_PX = 16;
export const COLUMN_HEADER_MOVE_EDGE_SIZE_PX = 18;
export const INSERT_COLUMN_BUTTON_OFFSET_PX = Math.round(
  BOARD_DND_GAP_PX / 2 + INSERT_COLUMN_BUTTON_SIZE_PX / 2,
);
export const INSERT_COLUMN_BUTTON_SAFE_TOP_PX = 24;
export const PRIORITY_GROUP_CARD_DROP_TYPE = "PRIORITY_GROUP_CARD";

export const dndHorizontalRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
  minWidth: "max-content",
  height: "100%",
  boxSizing: "border-box",
};

export const dndColumnShellStyle: CSSProperties = {
  width: COLUMN_WIDTH_PX,
  minWidth: COLUMN_WIDTH_PX,
  flexShrink: 0,
  marginRight: BOARD_DND_GAP_PX,
  height: "100%",
};

export const dndCardListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  // Use margins for spacing so hello-pangea's placeholder preserves exact vertical rhythm.
  // (The placeholder sizing logic accounts for margins; `gap` can visually "jump" on drag start.)
  marginBottom: -BOARD_DND_GAP_PX,
  minHeight: 120,
};

/** Card chrome on the HTML drag wrapper (matches board card tokens; no backdrop-filter). */
export const dndCardShellStyle: CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(121, 138, 91, 0.16)",
  backgroundColor: "#ffffff",
  boxShadow: "rgba(81, 102, 57, 0.1) 0px 8px 24px",
  padding: 16,
  marginBottom: BOARD_DND_GAP_PX,
  boxSizing: "border-box",
};

export function mergeDraggableStyle(
  base: CSSProperties,
  draggableProps: DraggableProvided["draggableProps"],
): { rest: Record<string, unknown>; style: CSSProperties } {
  const { style: dragStyle, ...rest } = draggableProps;
  return {
    rest: rest as Record<string, unknown>,
    style: { ...base, ...(dragStyle as CSSProperties | undefined) },
  };
}

export function columnPlaceholder(placeholder: ReactNode) {
  if (!placeholder || !isValidElement(placeholder)) {
    return placeholder;
  }

  const props = (placeholder.props ?? {}) as { style?: CSSProperties };
  return cloneElement(
    placeholder as ReactElement<any>,
    {
      style: {
        ...(props.style ?? {}),
        flex: "0 0 auto",
        flexShrink: 0,
        marginRight: BOARD_DND_GAP_PX,
      },
    } as any,
  );
}
