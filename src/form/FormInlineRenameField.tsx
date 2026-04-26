import type * as React from "react";
import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { FormInlineTextField } from "./FormInlineTextField";

type InlineKeyDownEvent = {
  key?: string;
  nativeEvent?: { key?: string };
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

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
  const skipNextBlurSubmitRef = useRef(false);

  useEffect(() => {
    form.reset({ title: defaultValue });
  }, [form, defaultValue]);

  const submit = form.handleSubmit(async (values) => {
    const next = values.title.trim();
    if (!next) {
      form.reset({ title: defaultValue });
      return;
    }
    if (next === defaultValue.trim()) {
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
          if (skipNextBlurSubmitRef.current) {
            skipNextBlurSubmitRef.current = false;
            return;
          }
          void submit();
        }}
        onKeyDown={(event: InlineKeyDownEvent) => {
          const key = event.key ?? event.nativeEvent?.key ?? "";
          if (key === "Enter") {
            if (disabled) return;
            skipNextBlurSubmitRef.current = true;
            event.preventDefault?.();
            // Keep key presses from bubbling into parent <form> handlers when present.
            event.stopPropagation?.();
            void submit();
            // If blur never happens (or happens much later), don't suppress a future blur submit.
            setTimeout(() => {
              skipNextBlurSubmitRef.current = false;
            }, 0);
          }
        }}
        {...(inputProps ?? {})}
      />
    </FormProvider>
  );
}
