import { Stack } from "@tamagui/core";
import { FormInlineRenameField } from "../../form";

type EditableBoardTitleProps = {
  title: string;
  disabled?: boolean;
  onSave: (title: string) => Promise<void> | void;
};

export function EditableBoardTitle({
  title,
  disabled = false,
  onSave,
}: Readonly<EditableBoardTitleProps>) {
  return (
    <Stack tag="h1" margin={0} flex={1} minWidth={0} maxWidth={760}>
      <FormInlineRenameField
        ariaLabel="Board title"
        defaultValue={title}
        maxLength={80}
        disabled={disabled}
        onSubmitTitle={onSave}
        inputProps={{
          width: "auto",
          maxWidth: "100%",
          flexGrow: 0,
          flexShrink: 1,
          alignSelf: "flex-start",
          color: "$boardHeading",
          fontSize: "$10",
          fontWeight: "800",
          height: 72,
          borderWidth: 1,
          borderRadius: "$4",
          borderColor: "transparent",
          backgroundColor: "transparent",
          boxShadow: "transparent 0px 0px 0px 0px",
          paddingHorizontal: 10,
          marginHorizontal: -10,
          marginTop: -4,
          focusStyle: { outlineWidth: 0 },
          focusVisibleStyle: {
            outlineWidth: 0,
            backgroundColor: "$boardPanelSurfaceStrong",
            borderColor: "$boardAccent",
            boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
          },
        }}
      />
    </Stack>
  );
}
