import { useEffect, useRef, useState } from "react";
import { Stack } from "@tamagui/core";
import { Input } from "@tamagui/input";

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
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(title);
    }
  }, [editing, title]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.select?.();
    }
  }, [editing]);

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
      setEditing(false);
      return;
    }

    setEditing(false);
    try {
      await onSave(next);
    } catch {}
  };

  return (
    <Stack tag="h1" margin={0} flex={1} minWidth={0} maxWidth={760}>
      <Input
        ref={(node: HTMLInputElement | null) => {
          inputRef.current = node;
        }}
        aria-label="Board title"
        value={editing ? draft : title}
        disabled={disabled}
        readOnly={!editing}
        maxLength={80}
        onFocus={() => {
          if (disabled) return;
          setDraft(title);
          setEditing(true);
        }}
        onChange={tamaguiInputValueOnChange(setDraft)}
        onBlur={() => {
          if (skipBlurSave.current) {
            skipBlurSave.current = false;
            return;
          }

          if (disabled) return;
          if (!editing) return;
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
        width="auto"
        maxWidth="100%"
        flexGrow={0}
        flexShrink={1}
        alignSelf="flex-start"
        color="$boardHeading"
        size="$6"
        borderWidth={1}
        borderRadius="$4"
        borderColor="transparent"
        backgroundColor="transparent"
        boxShadow="transparent 0px 0px 0px 0px"
        paddingHorizontal={10}
        paddingVertical={8}
        marginHorizontal={-10}
        marginVertical={-8}
        focusStyle={{ outlineWidth: 0 }}
        focusVisibleStyle={{
          outlineWidth: 0,
          backgroundColor: "$boardPanelSurfaceStrong",
          borderColor: "$boardAccent",
          boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
        }}
      />
    </Stack>
  );
}
