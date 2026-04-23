import { Link } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Checkbox } from "@tamagui/checkbox";
import { LinearGradient } from "@tamagui/linear-gradient";
import { Stack, Text, Theme } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { selectCounterPageCheckboxChecked, setChecked } from "../store/counter-page-checkbox-slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { trpc } from "../trpc/client";

/** Page backdrop; uses CSS vars emitted for `counterPageGrad*` tokens in `tamagui.config.ts`. */
const pageBackground =
  "linear-gradient(125deg, var(--c-color-counterPageGradLeft) 0%, var(--c-color-counterPageGradMid) 48%, var(--c-color-counterPageGradRight) 100%)";

export function TamaguiCounterScreen() {
  const dispatch = useAppDispatch();
  const checkboxChecked = useAppSelector(selectCounterPageCheckboxChecked);

  const counterQuery = trpc.counter.get.useQuery({});
  const increment = trpc.counter.increment.useMutation({
    onSuccess: async () => {
      await counterQuery.refetch();
    },
  });

  const value = counterQuery.data?.value ?? null;
  const errorMessage = counterQuery.error?.message ?? increment.error?.message ?? null;

  return (
    <Theme name="dark">
      <YStack
        flex={1}
        minHeight="100vh"
        backgroundImage={pageBackground}
        padding="$5"
        justifyContent="center"
        alignItems="center"
      >
        <YStack
          maxWidth={440}
          width="100%"
          backgroundColor="$counterCardSurface"
          borderRadius="$counterCard"
          borderWidth={1}
          borderColor="$counterCardBorder"
          padding="$5"
          gap="$4"
          boxShadow="rgba(0, 0, 0, 0.45) 0px 24px 60px"
        >
          <XStack alignItems="flex-start" gap="$3">
            <Stack
              width="$4"
              height="$4"
              borderRadius="$counterIcon"
              backgroundColor="$counterIconPurple"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="white" fontSize="$2" fontWeight="700" aria-hidden>
                ⎔
              </Text>
            </Stack>
            <YStack flex={1} gap="$2">
              <Text
                fontSize="$2"
                letterSpacing={2}
                textTransform="uppercase"
                color="$counterLabelMuted"
                fontWeight="600"
              >
                Shared count
              </Text>
              {counterQuery.isLoading ? (
                <Text fontSize="$8" fontWeight="800" color="$color12">
                  …
                </Text>
              ) : errorMessage ? (
                <Text fontSize="$4" color="$red10">
                  {errorMessage}
                </Text>
              ) : (
                <Text fontSize="$12" fontWeight="800" color="$color12" lineHeight="$12">
                  {value ?? "?"}
                </Text>
              )}
            </YStack>
          </XStack>

          <Button
            unstyled
            borderRadius="$counterButton"
            overflow="hidden"
            opacity={counterQuery.isLoading ? 0.5 : 1}
            disabled={counterQuery.isLoading || increment.isPending}
            onPress={() => increment.mutate({})}
            aria-busy={increment.isPending}
            aria-label="Increment shared count"
            pressStyle={{ scale: 0.98 }}
            cursor="pointer"
          >
            <LinearGradient
              start={[0, 0.5]}
              end={[1, 0.5]}
              colors={["#4facfe", "#9716ff"]}
              paddingVertical="$3"
              paddingHorizontal="$4"
              borderRadius="$counterButton"
            >
              <XStack gap="$2" justifyContent="center" alignItems="center">
                <Text color="white" fontSize="$6" fontWeight="700" aria-hidden>
                  ↗
                </Text>
                <Text color="white" fontSize="$6" fontWeight="700">
                  {increment.isPending ? "Incrementing…" : "Increment"}
                </Text>
              </XStack>
            </LinearGradient>
          </Button>

          <XStack
            backgroundColor="$counterInsetRowBg"
            borderRadius="$4"
            padding="$3"
            alignItems="center"
            gap="$3"
            borderWidth={1}
            borderColor="$counterCardBorder"
          >
            <Checkbox
              id="tamagui-counter-option"
              labelledBy="tamagui-counter-option-label"
              size="$3"
              checked={checkboxChecked}
              onCheckedChange={(next) => {
                dispatch(setChecked(next === true));
              }}
              borderRadius="$counterCheckbox"
            >
              <Checkbox.Indicator>
                <Text color="white" fontWeight="800" fontSize="$2">
                  ✓
                </Text>
              </Checkbox.Indicator>
            </Checkbox>
            <Text id="tamagui-counter-option-label" flex={1} fontSize="$4" color="$color12">
              Counter page option (Redux)
            </Text>
          </XStack>

          <Link to="/other-page">
            <XStack
              borderTopWidth={1}
              borderTopColor="$counterCardBorder"
              paddingTop="$4"
              marginTop="$1"
              alignItems="center"
              justifyContent="space-between"
              width="100%"
              cursor="pointer"
              hoverStyle={{ opacity: 0.9 }}
            >
              <XStack alignItems="center" gap="$2">
                <Stack
                  circular
                  width="$5"
                  height="$5"
                  backgroundColor="$counterIconPurple"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="white" fontSize="$3" aria-hidden>
                    ↗
                  </Text>
                </Stack>
                <Text color="$counterNavLink" fontSize="$4" fontWeight="600">
                  Other page
                </Text>
              </XStack>
              <Text color="$counterNavChevron" fontSize="$6" aria-hidden>
                ›
              </Text>
            </XStack>
          </Link>
        </YStack>
      </YStack>
    </Theme>
  );
}
