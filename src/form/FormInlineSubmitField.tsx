import { useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { FormProvider, useForm } from "react-hook-form";

type InlineKeyDownEvent = {
  key?: string;
  nativeEvent?: { key?: string; isComposing?: boolean; keyCode?: number };
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

export type FormInlineSubmitFieldProps<TValue> = Readonly<{
  defaultValue: TValue;
  disabled?: boolean;
  submitOnEnter?: boolean;
  normalize: (value: TValue) => TValue;
  isNoop: (next: TValue, current: TValue) => boolean;
  onSubmitValue: (next: TValue) => Promise<void> | void;
  render: (opts: {
    onBlur: () => void;
    onKeyDown: (e: InlineKeyDownEvent) => void;
  }) => ReactElement;
}>;

export function FormInlineSubmitField<TValue>({
  defaultValue,
  disabled = false,
  submitOnEnter = true,
  normalize,
  isNoop,
  onSubmitValue,
  render,
}: FormInlineSubmitFieldProps<TValue>) {
  const form = useForm<{ value: TValue }>({ defaultValues: { value: defaultValue } });
  const skipNextBlurSubmitRef = useRef(false);

  useEffect(() => {
    form.reset({ value: defaultValue });
  }, [form, defaultValue]);

  const submit = form.handleSubmit(async (values) => {
    const next = normalize(values.value);
    const current = normalize(defaultValue);
    if (isNoop(next, current)) return;
    await onSubmitValue(next);
  });

  return (
    <FormProvider {...form}>
      {render({
        onBlur: () => {
          if (disabled) return;
          if (skipNextBlurSubmitRef.current) {
            skipNextBlurSubmitRef.current = false;
            return;
          }
          void submit();
        },
        onKeyDown: (event: InlineKeyDownEvent) => {
          if (!submitOnEnter) return;
          if (event.nativeEvent?.isComposing === true || event.nativeEvent?.keyCode === 229) return;
          const key = event.key ?? event.nativeEvent?.key ?? "";
          if (key !== "Enter") return;
          if (disabled) return;
          skipNextBlurSubmitRef.current = true;
          event.preventDefault?.();
          event.stopPropagation?.();
          void submit();
          setTimeout(() => {
            skipNextBlurSubmitRef.current = false;
          }, 0);
        },
      })}
    </FormProvider>
  );
}
