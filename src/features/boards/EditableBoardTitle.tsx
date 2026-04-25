import { useEffect, useRef, useState } from "react";
import { Button } from "@tamagui/button";
import { Stack } from "@tamagui/core";
import { Input } from "@tamagui/input";
import { Text } from "@tamagui/core";

import { tamaguiInputValueOnChange } from "../../tamaguiRhfWebField";

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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const skipBlurSave = useRef(false);

  useEffect(() => {
    if (!editing) {
      setDraft(title);
    }
  }, [editing, title]);

  const cancel = () => {
    skipBlurSave.current = true;
    setDraft(title);
    setEditing(false);
  };

  const commit = async () => {
    const next = draft.trim();
    if (!next) {
      cancel();
      return;
    }

    if (next === title) {
      cancel();
      return;
    }

    try {
      await onSave(next);
      setEditing(false);
    } catch {
      cancel();
    }
  };

  return (
    <Stack tag="h1" margin={0} width="100%" maxWidth={760}>
      {editing ? (
        <Input
          aria-label="Board title"
          value={draft}
          disabled={disabled}
          autoFocus
          maxLength={80}
          onChange={tamaguiInputValueOnChange(setDraft)}
          onBlur={() => {
            if (skipBlurSave.current) {
              skipBlurSave.current = false;
              return;
            }

            if (disabled) {
              return;
            }

            void commit();
          }}
          onKeyDown={(event: { key?: string; nativeEvent?: { key?: string } }) => {
            const key = event.key ?? event.nativeEvent?.key ?? "";
            if (key === "Escape") {
              cancel();
              return;
            }

            if (key === "Enter") {
              void commit();
            }
          }}
          width="100%"
          minWidth={0}
          color="$boardHeading"
          fontSize="$10"
          fontWeight="800"
          lineHeight="$9"
          borderWidth={1}
          borderRadius="$4"
          borderColor="$boardAccent"
          backgroundColor="$boardPanelSurfaceStrong"
          boxShadow="rgba(95, 121, 56, 0.16) 0px 0px 0px 3px"
          paddingHorizontal={10}
          paddingVertical={8}
          marginHorizontal={-10}
          marginVertical={-8}
          focusStyle={{ outlineWidth: 0 }}
          focusVisibleStyle={{ outlineWidth: 0 }}
        />
      ) : (
        <Button
          chromeless
          disabled={disabled}
          aria-label="Edit board title"
          alignSelf="flex-start"
          justifyContent="flex-start"
          height="auto"
          minHeight={0}
          paddingHorizontal={10}
          paddingVertical={8}
          marginHorizontal={-10}
          marginVertical={-8}
          borderWidth={1}
          borderRadius="$4"
          borderColor="transparent"
          backgroundColor="transparent"
          hoverStyle={{ backgroundColor: "$boardAccentWash" }}
          focusVisibleStyle={{
            backgroundColor: "$boardPanelSurfaceStrong",
            borderColor: "$boardAccent",
            boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
            outlineWidth: 0,
          }}
          onPress={() => {
            setDraft(title);
            setEditing(true);
          }}
        >
          <Text fontSize="$10" fontWeight="800" color="$boardHeading" lineHeight="$9">
            {title}
          </Text>
        </Button>
      )}
    </Stack>
  );
}
