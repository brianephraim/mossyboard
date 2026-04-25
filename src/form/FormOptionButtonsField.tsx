import { Fragment, useId } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@tamagui/button";
import { XStack } from "@tamagui/stacks";
import {
  useController,
  useFormContext,
  type Control,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type UseControllerProps,
} from "react-hook-form";

import { FormFieldFrame, joinAriaIds } from "./FormFieldFrame";

type FormFieldFrameProps = ComponentProps<typeof FormFieldFrame>;

type FormOption<TValue extends string> = Readonly<{
  disabled?: boolean;
  label: string;
  value: TValue;
}>;

type FormOptionButtonRenderArgs<TValue extends string> = Readonly<{
  buttonProps: Readonly<{
    "aria-invalid"?: boolean;
    "aria-pressed": boolean;
    disabled?: boolean;
    onBlur: () => void;
    onPress: () => void;
  }>;
  option: FormOption<TValue>;
  selected: boolean;
}>;

type FormOptionButtonsFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TValue extends string,
> = Readonly<{
  control?: Control<TFieldValues>;
  defaultValue?: FieldPathValue<TFieldValues, TName>;
  description?: string;
  fieldProps?: FormFieldFrameProps["fieldProps"];
  inputId?: string;
  label: string;
  labelProps?: FormFieldFrameProps["labelProps"];
  name: TName;
  options: readonly FormOption<TValue>[];
  optionsProps?: Omit<ComponentProps<typeof XStack>, "children">;
  renderOption?: (args: FormOptionButtonRenderArgs<TValue>) => ReactNode;
  rules?: UseControllerProps<TFieldValues, TName>["rules"];
}>;

export function FormOptionButtonsField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TValue extends string,
>({
  control,
  defaultValue,
  description,
  fieldProps,
  inputId,
  label,
  labelProps,
  name,
  options,
  optionsProps,
  renderOption,
  rules,
}: FormOptionButtonsFieldProps<TFieldValues, TName, TValue>) {
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
    description ? descriptionId : undefined,
    fieldState.error ? errorId : undefined,
  );

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
      <XStack
        gap="$2"
        flexWrap="wrap"
        role="group"
        aria-describedby={describedBy}
        aria-invalid={fieldState.invalid}
        aria-labelledby={labelId}
        {...optionsProps}
      >
        {options.map((option) => {
          const selected = field.value === option.value;
          const buttonProps = {
            "aria-invalid": fieldState.invalid ? true : undefined,
            "aria-pressed": selected,
            disabled: option.disabled,
            onBlur: field.onBlur,
            onPress: () => {
              field.onChange(option.value);
              field.onBlur();
            },
          };

          if (renderOption) {
            return (
              <Fragment key={option.value}>
                {renderOption({
                  buttonProps,
                  option,
                  selected,
                })}
              </Fragment>
            );
          }

          const defaultButtonProps = {
            ...buttonProps,
            backgroundColor: selected ? "$color4" : undefined,
            borderColor: selected ? "$color8" : undefined,
          } as unknown as ComponentProps<typeof Button>;

          return (
            <Button key={option.value} {...defaultButtonProps}>
              {option.label}
            </Button>
          );
        })}
      </XStack>
    </FormFieldFrame>
  );
}
