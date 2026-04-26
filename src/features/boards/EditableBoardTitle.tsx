import { useEffect } from "react";
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
  useEffect(() => {
    form.reset({ title });
  }, [form, title]);

  const submit = form.handleSubmit(async (values) => {
    const next = values.title.trim();
    if (!next) {
      form.reset({ title });
      return;
    }

    if (next === title) {
      return;
    }

    await onSave(next);
  });

  return (
    <Stack tag="h1" margin={0} flex={1} minWidth={0} maxWidth={760}>
      <FormProvider {...form}>
        <FormInlineTextField<{ title: string }, "title">
          name={name}
          aria-label="Board title"
          defaultValue={title}
          maxLength={80}
          onBlur={() => {
            if (disabled) return;
            void submit();
          }}
          onKeyDown={(event: { key?: string; nativeEvent?: { key?: string } }) => {
            const key = event.key ?? event.nativeEvent?.key ?? "";
            if (key === "Enter") {
              void submit();
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
          height={72}
          borderWidth={1}
          borderRadius="$4"
          borderColor="transparent"
          backgroundColor="transparent"
          boxShadow="transparent 0px 0px 0px 0px"
          paddingHorizontal={10}
          marginHorizontal={-10}
          marginTop={-4}
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
