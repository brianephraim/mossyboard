import type { ComponentProps } from "react";
import { Input } from "@tamagui/input";
import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { FormInlineTextField } from "./FormInlineTextField";

type InlineKeyDownEvent = {
  key?: string;
  nativeEvent?: { key?: string; isComposing?: boolean; keyCode?: number };
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

type InlineRenameInputProps = Omit<
  ComponentProps<typeof Input>,
  "aria-describedby" | "aria-invalid" | "id" | "name" | "ref" | "value" | "onBlur" | "onKeyDown"
> & {
  // Tamagui style props (web/native unions) aren't always reflected on the
  // `Input` component props type, but they are supported at runtime.
  fontSize?: unknown;
  fontWeight?: unknown;
  color?: unknown;
  boxShadow?: unknown;
  focusStyle?: unknown;
  focusVisibleStyle?: unknown;
};

export type FormInlineRenameFieldProps = {
  ariaLabel: string;
  defaultValue: string;
  disabled?: boolean;
  focusOnMouseUp?: boolean;
  maxLength?: number;
  onSubmitTitle: (nextTitle: string) => Promise<void> | void;
  inputProps?: InlineRenameInputProps;
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
          if (event.nativeEvent?.isComposing === true || event.nativeEvent?.keyCode === 229) {
            return;
          }
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
