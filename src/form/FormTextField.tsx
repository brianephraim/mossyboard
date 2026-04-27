import { useId } from "react";
import type { ComponentProps } from "react";
import { Input } from "@tamagui/input";
import {
  useController,
  useFormContext,
  type Control,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type UseControllerProps,
} from "react-hook-form";

import { FormFieldFrame } from "./FormFieldFrame";
import { joinAriaIds } from "./joinAriaIds";
import { tamaguiInputValueOnChange } from "./tamaguiFieldAdapters";

type FormFieldFrameProps = ComponentProps<typeof FormFieldFrame>;

type FormTextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = Readonly<{
  additionalDescribedBy?: string;
  control?: Control<TFieldValues>;
  defaultBorderColor?: ComponentProps<typeof Input>["borderColor"];
  defaultValue?: FieldPathValue<TFieldValues, TName>;
  description?: string;
  fieldProps?: FormFieldFrameProps["fieldProps"];
  inputId?: string;
  invalidBorderColor?: ComponentProps<typeof Input>["borderColor"];
  label: string;
  labelProps?: FormFieldFrameProps["labelProps"];
  name: TName;
  rules?: UseControllerProps<TFieldValues, TName>["rules"];
}> &
  Omit<
    ComponentProps<typeof Input>,
    | "aria-describedby"
    | "aria-invalid"
    | "aria-labelledby"
    | "defaultValue"
    | "id"
    | "name"
    | "onBlur"
    | "onChange"
    | "ref"
    | "value"
  >;

export function FormTextField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  additionalDescribedBy,
  control,
  defaultBorderColor,
  defaultValue,
  description,
  fieldProps,
  inputId,
  invalidBorderColor = "$red8",
  label,
  labelProps,
  name,
  rules,
  ...inputProps
}: FormTextFieldProps<TFieldValues, TName>) {
  const generatedId = useId();
  const { control: contextControl } = useFormContext<TFieldValues>();
  const { field, fieldState } = useController({
    control: control ?? contextControl,
    defaultValue,
    name,
    rules,
  });
  const resolvedInputId = inputId ?? `${generatedId}-field`;
  const labelId = `${resolvedInputId}-label`;
  const descriptionId = `${resolvedInputId}-description`;
  const errorId = `${resolvedInputId}-error`;
  const describedBy = joinAriaIds(
    additionalDescribedBy,
    description ? descriptionId : undefined,
    fieldState.error ? errorId : undefined,
  );
  const resolvedBorderColor = fieldState.invalid
    ? invalidBorderColor
    : (defaultBorderColor ?? inputProps.borderColor);

  return (
    <FormFieldFrame
      description={description}
      descriptionId={descriptionId}
      errorId={errorId}
      errorMessage={fieldState.error?.message}
      fieldProps={fieldProps}
      inputId={resolvedInputId}
      label={label}
      labelId={labelId}
      labelProps={labelProps}
    >
      <Input
        {...inputProps}
        id={resolvedInputId}
        name={field.name}
        ref={field.ref}
        value={(field.value as string | undefined) ?? ""}
        onBlur={field.onBlur}
        onChange={tamaguiInputValueOnChange(field.onChange)}
        aria-describedby={describedBy}
        aria-invalid={fieldState.invalid}
        aria-labelledby={labelId}
        borderColor={resolvedBorderColor}
        disabled={field.disabled ?? inputProps.disabled}
      />
    </FormFieldFrame>
  );
}
