import { BoardActionButton } from "../ui";
import { INSERT_COLUMN_BUTTON_SIZE_PX } from "./layout";

export function InsertColumnCircleButton({
  ariaLabel,
  onPress,
}: Readonly<{
  ariaLabel: string;
  onPress: () => void;
}>) {
  return (
    <BoardActionButton
      tone="ghost"
      aria-label={ariaLabel}
      onPress={onPress}
      width={INSERT_COLUMN_BUTTON_SIZE_PX}
      height={INSERT_COLUMN_BUTTON_SIZE_PX}
      borderRadius={9999}
      paddingHorizontal={0}
      paddingVertical={0}
      borderWidth={1}
      borderColor="$boardShellBorder"
      backgroundColor="$boardPanelSurfaceStrong"
      hoverStyle={{ backgroundColor: "$boardAccentWash" }}
      marginTop={-20}
    >
      +
    </BoardActionButton>
  );
}
