import { Stack, Text } from "@tamagui/core";

import { BoardActionButton } from "../ui";
import { CARD_CHROME_PADDING_PX } from "./layout";

type Direction = "left" | "right" | "up" | "down";

const arrowGlyph: Record<Direction, string> = {
  left: "‹",
  right: "›",
  up: "˄",
  down: "˅",
};

type EdgeMoveButtonProps = {
  direction: Direction;
  ariaLabel: string;
  visible: boolean;
  disabled?: boolean;
  thickness: number;
  parallelOffset?: number;
  perpendicularOffset?: number;
  onPress: () => void;
  onHoverChange?: (hovering: boolean) => void;
};

export function EdgeMoveButton({
  direction,
  ariaLabel,
  visible,
  disabled,
  thickness,
  parallelOffset = CARD_CHROME_PADDING_PX,
  perpendicularOffset = CARD_CHROME_PADDING_PX,
  onPress,
  onHoverChange,
}: Readonly<EdgeMoveButtonProps>) {
  const isHorizontal = direction === "up" || direction === "down";

  const positionProps = isHorizontal
    ? {
        [direction === "up" ? "top" : "bottom"]: -parallelOffset,
        left: -perpendicularOffset,
        right: -perpendicularOffset,
        height: thickness,
      }
    : {
        [direction === "left" ? "left" : "right"]: -parallelOffset,
        top: -perpendicularOffset,
        bottom: -perpendicularOffset,
        width: thickness,
      };

  return (
    <Stack
      position="absolute"
      {...positionProps}
      zIndex={2}
      opacity={visible ? 1 : 0}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <BoardActionButton
        tone="ghost"
        aria-label={ariaLabel}
        disabled={disabled}
        onPress={onPress}
        width="100%"
        height="100%"
        borderWidth={0}
        borderRadius={0}
        paddingHorizontal={0}
        paddingVertical={0}
        justifyContent="center"
        alignItems="center"
        backgroundColor="rgba(255, 255, 255, 0.01)"
        hoverStyle={{ backgroundColor: "rgba(145, 168, 108, 0.12)" }}
        pressStyle={{ backgroundColor: "rgba(145, 168, 108, 0.18)" }}
      >
        <Text
          fontSize={isHorizontal ? "$5" : "$6"}
          fontWeight={isHorizontal ? "900" : "800"}
          color="$boardTextMuted"
        >
          {arrowGlyph[direction]}
        </Text>
      </BoardActionButton>
    </Stack>
  );
}
