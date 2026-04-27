import type { ComponentProps, ReactNode } from "react";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

type FormFieldFrameProps = Readonly<{
  children: ReactNode;
  description?: string;
  descriptionId: string;
  errorId: string;
  errorMessage?: string;
  fieldProps?: Omit<ComponentProps<typeof YStack>, "children" | "tag" | "htmlFor">;
  inputId: string;
  label: string;
  labelId: string;
  labelProps?: Omit<ComponentProps<typeof Text>, "children" | "id">;
  descriptionProps?: Omit<ComponentProps<typeof Text>, "children" | "id">;
  errorProps?: Omit<ComponentProps<typeof Text>, "children" | "id" | "role">;
}>;

export function FormFieldFrame({
  children,
  description,
  descriptionId,
  errorId,
  errorMessage,
  fieldProps,
  inputId,
  label,
  labelId,
  labelProps,
  descriptionProps,
  errorProps,
}: FormFieldFrameProps) {
  return (
    <YStack tag="label" htmlFor={inputId} gap="$2" {...fieldProps}>
      <Text id={labelId} fontWeight="600" color="$color12" {...labelProps}>
        {label}
      </Text>
      {description ? (
        <Text id={descriptionId} color="$color11" {...descriptionProps}>
          {description}
        </Text>
      ) : null}
      {children}
      {errorMessage ? (
        <Text id={errorId} color="$red10" role="alert" {...errorProps}>
          {errorMessage}
        </Text>
      ) : null}
    </YStack>
  );
}
