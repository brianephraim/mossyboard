import { useId } from "react";
import type { ComponentProps } from "react";
import { Input } from "@tamagui/input";
import {
  useFormContext,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type RegisterOptions,
  type UseControllerProps,
} from "react-hook-form";

import { joinAriaIds } from "./FormFieldFrame";

type FormInlineTextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Readonly<{
  additionalDescribedBy?: string;
  "aria-label": string;
  defaultValue?: FieldPathValue<TFieldValues, TName>;
  inputId?: string;
  name: TName;
  rules?: RegisterOptions<TFieldValues, TName> | UseControllerProps<TFieldValues, TName>["rules"];
  inputRef?: (node: HTMLInputElement | null) => void;
}> &
  Omit<
    ComponentProps<typeof Input>,
    "aria-describedby" | "aria-invalid" | "id" | "name" | "ref" | "value"
  >;

export function FormInlineTextField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  additionalDescribedBy,
  defaultValue,
  inputId,
  inputRef,
  name,
  rules,
  ...inputProps
}: FormInlineTextFieldProps<TFieldValues, TName>) {
  const generatedId = useId();
  const { register, getFieldState, formState } = useFormContext<TFieldValues>();
  const fieldState = getFieldState(name, formState);
  const resolvedInputId = inputId ?? `${generatedId}-field`;
  const describedBy = joinAriaIds(additionalDescribedBy);
  const { onBlur: onBlurProp, onChange: onChangeProp, ...restInputProps } = inputProps;
  const registration = register(name, rules as RegisterOptions<TFieldValues, TName> | undefined);

  return (
    <Input
      {...restInputProps}
      id={resolvedInputId}
      name={registration.name}
      defaultValue={defaultValue as string | undefined}
      ref={(node: HTMLInputElement | null) => {
        registration.ref(node);
        inputRef?.(node);
      }}
      onBlur={(event) => {
        registration.onBlur(event);
        onBlurProp?.(event);
      }}
      onChange={(event) => {
        registration.onChange(event);
        onChangeProp?.(event);
      }}
      aria-describedby={describedBy}
      aria-invalid={fieldState.invalid}
      disabled={restInputProps.disabled}
    />
  );
}
