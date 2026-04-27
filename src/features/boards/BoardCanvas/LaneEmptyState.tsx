import { Text } from "@tamagui/core";

export function LaneEmptyState({
  isVisible,
  isRealColumn,
  isFiltered,
}: Readonly<{
  isVisible: boolean;
  isRealColumn: boolean;
  isFiltered: boolean;
}>) {
  if (!isVisible) {
    return null;
  }

  return (
    <Text
      position="absolute"
      top={0}
      left={0}
      right={0}
      paddingTop="$3"
      paddingHorizontal="$4"
      pointerEvents="none"
      color="$boardTextMuted"
      fontSize="$3"
    >
      {isFiltered
        ? "No cards in this column match the active priority filter."
        : isRealColumn
          ? "This column is empty. Add a card to get it moving."
          : "No cards match this group right now."}
    </Text>
  );
}
