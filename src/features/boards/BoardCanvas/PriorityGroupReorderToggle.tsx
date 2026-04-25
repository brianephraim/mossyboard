import { useId } from "react";
import { Checkbox } from "@tamagui/checkbox";
import { Text } from "@tamagui/core";
import { XStack } from "@tamagui/stacks";

const TOGGLE_LABEL = "Allow re-ordering in this view, which will impact the user order";

export function PriorityGroupReorderToggle({
  checked,
  onCheckedChange,
}: Readonly<{
  checked: boolean;
  onCheckedChange: (enabled: boolean) => void;
}>) {
  const checkboxId = useId();

  return (
    <XStack tag="label" htmlFor={checkboxId} alignItems="center" gap="$2" cursor="pointer">
      <Checkbox
        id={checkboxId}
        checked={checked}
        size="$3"
        aria-label={TOGGLE_LABEL}
        onCheckedChange={(value) => {
          onCheckedChange(value === true);
        }}
      >
        <Checkbox.Indicator>
          <Text fontWeight="800">✓</Text>
        </Checkbox.Indicator>
      </Checkbox>
      <Text color="$boardHeading" fontSize="$2" fontWeight="600" maxWidth={280}>
        {TOGGLE_LABEL}
      </Text>
    </XStack>
  );
}
