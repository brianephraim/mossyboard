import type { ComponentProps } from "react";
import { Text } from "@tamagui/core";

const brandFontFamily =
  'Chewy, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

export const brandTextFontFamily = brandFontFamily as unknown as ComponentProps<
  typeof Text
>["fontFamily"];
