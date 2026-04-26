import type * as React from "react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { FormInlineTextField } from "./FormInlineTextField";

export type FormInlineRenameFieldProps = {
  ariaLabel: string;
  defaultValue: string;
  disabled?: boolean;
  focusOnMouseUp?: boolean;
  maxLength?: number;
  onSubmitTitle: (nextTitle: string) => Promise<void> | void;
  inputProps?: Omit<
    React.ComponentProps<typeof FormInlineTextField<{ title: string }, "title">>,
    | "name"
    | "defaultValue"
    | "disabled"
    | "aria-label"
    | "focusOnMouseUp"
    | "maxLength"
    | "onBlur"
    | "onKeyDown"
  >;
};

export function FormInlineRenameField({
  ariaLabel,
  defaultValue,
  disabled = false,
  focusOnMouseUp = false,
  maxLength,
  onSubmitTitle,
  inputProps,
}: Readonly<FormInlineRenameFieldProps>) {
  const form = useForm<{ title: string }>({ defaultValues: { title: defaultValue } });

  useEffect(() => {
    form.reset({ title: defaultValue });
  }, [form, defaultValue]);

  const submit = form.handleSubmit(async (values) => {
    const next = values.title.trim();
    if (!next) {
      form.reset({ title: defaultValue });
      return;
    }
    if (next === defaultValue) {
      return;
    }
    await onSubmitTitle(next);
  });

  return (
    <FormProvider {...form}>
      <FormInlineTextField<{ title: string }, "title">
        name="title"
        aria-label={ariaLabel}
        defaultValue={defaultValue}
        disabled={disabled}
        focusOnMouseUp={focusOnMouseUp}
        maxLength={maxLength}
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
        {...(inputProps ?? {})}
      />
    </FormProvider>
  );
}
