import type { ChangeEvent, ComponentProps } from "react";
import { Input, TextArea } from "@tamagui/input";

type TamaguiInputOnChange = NonNullable<ComponentProps<typeof Input>["onChange"]>;
type TamaguiTextAreaOnChange = NonNullable<ComponentProps<typeof TextArea>["onChange"]>;

/** Tamagui web `Input` strips `onChangeText`; wire RHF `field.onChange` via DOM `onChange`. */
export function tamaguiInputValueOnChange(
  rhfOnChange: (value: string) => void,
): TamaguiInputOnChange {
  return ((e: ChangeEvent<HTMLInputElement>) =>
    rhfOnChange(e.currentTarget.value)) as TamaguiInputOnChange;
}

/** Same as {@link tamaguiInputValueOnChange} for `TextArea` (`tag="textarea"`). */
export function tamaguiTextAreaValueOnChange(
  rhfOnChange: (value: string) => void,
): TamaguiTextAreaOnChange {
  return ((e: ChangeEvent<HTMLTextAreaElement>) =>
    rhfOnChange(e.currentTarget.value)) as unknown as TamaguiTextAreaOnChange;
}
