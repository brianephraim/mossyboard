import type { ChangeEvent, ComponentProps } from "react";
import { Input, TextArea } from "@tamagui/input";

type TamaguiInputOnChange = NonNullable<ComponentProps<typeof Input>["onChange"]>;
type TamaguiTextAreaOnChange = NonNullable<ComponentProps<typeof TextArea>["onChange"]>;

type TamaguiTextInputChangeEvent =
  | ChangeEvent<HTMLInputElement>
  | ChangeEvent<HTMLTextAreaElement>
  | {
      target?: {
        value?: string | null;
      };
      currentTarget?: {
        value?: string | null;
      };
      nativeEvent?: Event | { text?: string | null };
    };

function isNativeTextEvent(
  value: TamaguiTextInputChangeEvent["nativeEvent"],
): value is { text?: string | null } {
  return Boolean(value && typeof value === "object" && "text" in value);
}

export function readTamaguiTextInputValue(event: TamaguiTextInputChangeEvent): string {
  if (event.target?.value) {
    return event.target.value;
  }

  if (event.currentTarget?.value) {
    return event.currentTarget.value;
  }

  if (isNativeTextEvent(event.nativeEvent)) {
    return event.nativeEvent.text ?? "";
  }

  return "";
}

export function tamaguiInputValueOnChange(onChange: (value: string) => void): TamaguiInputOnChange {
  return ((event: ChangeEvent<HTMLInputElement>) =>
    onChange(readTamaguiTextInputValue(event))) as TamaguiInputOnChange;
}

export function tamaguiTextAreaValueOnChange(
  onChange: (value: string) => void,
): TamaguiTextAreaOnChange {
  return ((event: ChangeEvent<HTMLTextAreaElement>) =>
    onChange(readTamaguiTextInputValue(event))) as unknown as TamaguiTextAreaOnChange;
}
