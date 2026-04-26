import { useEffect, useRef, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Stack } from "@tamagui/core";
import { FormInlineTextField } from "../../form";

type EditableBoardTitleProps = {
  name: "title";
  title: string;
  disabled?: boolean;
  onSave: (title: string) => Promise<void> | void;
};

export function EditableBoardTitle({
  name,
  title,
  disabled = false,
  onSave,
}: Readonly<EditableBoardTitleProps>) {
  const form = useForm<{ title: string }>({
    defaultValues: { title },
  });
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const skipBlurSave = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) {
      form.reset({ title });
    }
  }, [editing, form, title]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.select?.();
    }
  }, [editing]);

  const cancel = () => {
    skipBlurSave.current = true;
    editingRef.current = false;
    form.reset({ title });
    setEditing(false);
  };

  const commit = async () => {
    const raw = inputRef.current?.value ?? form.getValues(name);
    const next = raw.trim();
    if (!next) {
      cancel();
      return;
    }

    if (next === title) {
      editingRef.current = false;
      setEditing(false);
      return;
    }

    editingRef.current = false;
    setEditing(false);
    try {
      await onSave(next);
    } catch {}
  };

  return (
    <Stack tag="h1" margin={0} flex={1} minWidth={0} maxWidth={760}>
      <FormProvider {...form}>
        <FormInlineTextField<{ title: string }, "title">
          name={name}
          aria-label="Board title"
          inputRef={(node) => {
            inputRef.current = node;
          }}
          maxLength={80}
          onFocus={() => {
            if (disabled) return;
            form.reset({ title });
            editingRef.current = true;
            setEditing(true);
          }}
          onBlur={() => {
            if (skipBlurSave.current) {
              skipBlurSave.current = false;
              return;
            }

            if (disabled) return;
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
          fontSize="$10"
          fontWeight="800"
          lineHeight={52}
          height={72}
          minHeight={72}
          borderWidth={1}
          borderRadius="$4"
          borderColor="transparent"
          backgroundColor="transparent"
          boxShadow="transparent 0px 0px 0px 0px"
          paddingHorizontal={10}
          paddingTop={14}
          paddingBottom={14}
          marginHorizontal={-10}
          marginTop={-4}
          marginBottom={8}
          focusStyle={{ outlineWidth: 0 }}
          focusVisibleStyle={{
            outlineWidth: 0,
            backgroundColor: "$boardPanelSurfaceStrong",
            borderColor: "$boardAccent",
            boxShadow: "rgba(95, 121, 56, 0.16) 0px 0px 0px 3px",
          }}
        />
      </FormProvider>
    </Stack>
  );
}
