import type { ComponentProps, ReactNode } from "react";
import { Button } from "@tamagui/button";
import { LinearGradient } from "@tamagui/linear-gradient";
import { Stack, Text, Theme, useMedia } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { boardPriorityMeta } from "./model";
import type { CardPriority } from "./types";

const pageBackground = [
  "radial-gradient(circle at 0% 100%, rgba(133, 168, 89, 0.28) 0%, rgba(133, 168, 89, 0) 28%)",
  "radial-gradient(circle at 18% 12%, rgba(91, 118, 58, 0.24) 0%, rgba(91, 118, 58, 0) 26%)",
  "linear-gradient(140deg, var(--c-color-boardBackdropTop) 0%, var(--c-color-boardPageBg) 36%, var(--c-color-boardBackdropBottom) 100%)",
].join(", ");

export function BoardPageChrome({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Theme name="light">
      <YStack height="100vh" backgroundImage={pageBackground} position="relative" overflow="hidden">
        <BoardBackdropArt />
        <YStack position="relative" zIndex={1} flex={1} minHeight={0}>
          {children}
        </YStack>
      </YStack>
    </Theme>
  );
}

function BoardBackdropArt() {
  return (
    <>
      <LinearGradient
        position="absolute"
        inset={0}
        start={[0, 0]}
        end={[1, 1]}
        colors={["rgba(255, 255, 255, 0.03)", "rgba(0, 0, 0, 0.06)"]}
      />
      <Stack
        position="absolute"
        left={-180}
        bottom={-180}
        width={560}
        height={560}
        borderRadius={9999}
        backgroundColor="rgba(128, 160, 81, 0.18)"
      />
      <Stack
        position="absolute"
        left={120}
        top={-150}
        width={380}
        height={380}
        borderRadius={9999}
        backgroundColor="rgba(83, 104, 57, 0.18)"
      />
      <Stack
        position="absolute"
        right={-120}
        top={120}
        width={360}
        height={360}
        borderRadius={9999}
        backgroundColor="rgba(77, 95, 55, 0.12)"
      />
    </>
  );
}

export function BoardSurface({
  children,
  padding = "$5",
  ...props
}: Readonly<
  { children: ReactNode; padding?: ComponentProps<typeof YStack>["padding"] } & Omit<
    ComponentProps<typeof YStack>,
    "children" | "padding"
  >
>) {
  return (
    <YStack
      backgroundColor="$boardShellSurface"
      borderWidth={1}
      borderColor="$boardShellBorder"
      borderRadius="$boardShell"
      padding={padding}
      gap="$4"
      boxShadow="rgba(18, 27, 16, 0.08) 0px 18px 48px"
      {...props}
    >
      {children}
    </YStack>
  );
}

export function BoardPill({
  children,
  backgroundColor = "$boardAccentSoft",
  color = "$boardAccent",
}: Readonly<{
  children: ReactNode;
  backgroundColor?: ComponentProps<typeof XStack>["backgroundColor"];
  color?: ComponentProps<typeof Text>["color"];
}>) {
  return (
    <XStack
      alignItems="center"
      justifyContent="center"
      paddingHorizontal="$3"
      paddingVertical="$2"
      borderRadius="$boardPill"
      backgroundColor={backgroundColor}
    >
      <Text color={color} fontSize="$2" fontWeight="600">
        {children}
      </Text>
    </XStack>
  );
}

export function PriorityPill({ priority }: Readonly<{ priority: CardPriority }>) {
  const meta = boardPriorityMeta[priority] as {
    shortLabel: string;
    backgroundColor: ComponentProps<typeof XStack>["backgroundColor"];
    textColor: ComponentProps<typeof Text>["color"];
  };

  return (
    <BoardPill backgroundColor={meta.backgroundColor} color={meta.textColor}>
      {meta.shortLabel}
    </BoardPill>
  );
}

export function BoardSectionHeading({
  eyebrow,
  title,
  subtitle,
  actions,
}: Readonly<{
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}>) {
  return (
    <YStack gap="$2" width="100%" minWidth={0}>
      {eyebrow ? (
        <Text textTransform="uppercase" letterSpacing={1.5} fontSize="$2" color="$boardTextSubtle">
          {eyebrow}
        </Text>
      ) : null}
      <YStack gap="$2" width="100%" minWidth={0}>
        {actions ? (
          <XStack alignItems="center" gap="$2" width="100%">
            <Stack flexGrow={1} minWidth={0}>
              {typeof title === "string" ? (
                <Text
                  tag="h1"
                  fontSize="$10"
                  fontWeight="800"
                  color="$boardHeading"
                  lineHeight="$9"
                  numberOfLines={1}
                  minWidth={0}
                >
                  {title}
                </Text>
              ) : (
                title
              )}
            </Stack>
            {actions}
          </XStack>
        ) : typeof title === "string" ? (
          <Text tag="h1" fontSize="$10" fontWeight="800" color="$boardHeading" lineHeight="$9">
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle ? (
          <Text fontSize="$5" color="$boardTextMuted">
            {subtitle}
          </Text>
        ) : null}
      </YStack>
    </YStack>
  );
}

export function BoardActionButton({
  children,
  form,
  tone = "default",
  type,
  ...props
}: Readonly<
  {
    children: ReactNode;
    form?: string;
    tone?: "default" | "accent" | "danger" | "ghost";
    type?: "button" | "reset" | "submit";
  } & ComponentProps<typeof Button>
>) {
  const media = useMedia();
  const styles = (
    tone === "accent"
      ? {
          backgroundColor: "$boardAccent",
          color: "white",
          borderColor: "$boardAccent",
          hoverStyle: { backgroundColor: "$boardAccentHover" },
        }
      : tone === "danger"
        ? {
            backgroundColor: "$boardDangerBg",
            color: "$boardDangerText",
            borderColor: "$boardDangerText",
            hoverStyle: { opacity: 0.92 },
          }
        : tone === "ghost"
          ? {
              chromeless: true,
              color: "$boardTextMuted",
              borderColor: "$boardShellBorder",
              hoverStyle: { backgroundColor: "$boardAccentWash" },
            }
          : {
              backgroundColor: "$boardPanelSurfaceStrong",
              color: "$boardHeading",
              borderColor: "$boardShellBorder",
              hoverStyle: { backgroundColor: "$boardAccentWash" },
            }
  ) satisfies ComponentProps<typeof Button>;

  return (
    <Button
      size={media.maxMd ? "$2" : "$3"}
      borderRadius="$10"
      borderWidth={1}
      paddingHorizontal={media.maxMd ? "$3" : "$4"}
      fontWeight="600"
      fontSize={media.maxMd ? "$3" : "$4"}
      {...styles}
      {...({ form, type } as unknown as ComponentProps<typeof Button>)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function BoardStateCard({
  title,
  description,
  actions,
}: Readonly<{
  title: string;
  description: string;
  actions?: ReactNode;
}>) {
  return (
    <BoardSurface padding="$6">
      <YStack gap="$4" alignItems="flex-start">
        <YStack gap="$2">
          <Text tag="h2" fontSize="$8" fontWeight="700" color="$boardHeading">
            {title}
          </Text>
          <Text color="$boardTextMuted" fontSize="$5" maxWidth={620}>
            {description}
          </Text>
        </YStack>
        {actions ? (
          <XStack gap="$3" flexWrap="wrap">
            {actions}
          </XStack>
        ) : null}
      </YStack>
    </BoardSurface>
  );
}

export function BoardInlineNotice({
  tone,
  message,
  actions,
}: Readonly<{
  tone: "warning" | "success" | "danger";
  message: string;
  actions?: ReactNode;
}>) {
  const palette = (
    tone === "warning"
      ? {
          backgroundColor: "$boardWarningBg",
          color: "$boardWarningText",
          borderColor: "rgba(129, 95, 17, 0.14)",
        }
      : tone === "danger"
        ? {
            backgroundColor: "$boardDangerBg",
            color: "$boardDangerText",
            borderColor: "rgba(161, 64, 47, 0.14)",
          }
        : {
            backgroundColor: "$boardSuccessBg",
            color: "$boardSuccessText",
            borderColor: "rgba(47, 110, 61, 0.14)",
          }
  ) satisfies {
    backgroundColor: ComponentProps<typeof XStack>["backgroundColor"];
    color: ComponentProps<typeof Text>["color"];
    borderColor: ComponentProps<typeof XStack>["borderColor"];
  };

  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      gap="$3"
      flexWrap="wrap"
      backgroundColor={palette.backgroundColor}
      borderWidth={1}
      borderColor={palette.borderColor}
      borderRadius="$8"
      paddingHorizontal="$4"
      paddingVertical="$3"
    >
      <Text color={palette.color} fontWeight="600" flex={1}>
        {message}
      </Text>
      {actions ? (
        <XStack gap="$2" flexWrap="wrap">
          {actions}
        </XStack>
      ) : null}
    </XStack>
  );
}

export function BoardLiveRegion({ message }: Readonly<{ message: string | null }>) {
  if (!message) {
    return null;
  }

  return (
    <Text position="absolute" width={1} height={1} overflow="hidden" opacity={0} aria-live="polite">
      {message}
    </Text>
  );
}

export function BoardResponsiveColumns({
  rail,
  content,
}: Readonly<{
  rail: ReactNode;
  content: ReactNode;
}>) {
  const media = useMedia();

  if (media.maxMd) {
    return (
      <YStack padding="$4" flex={1} minHeight={0}>
        {content}
      </YStack>
    );
  }

  return (
    <XStack gap="$4" padding="$4" alignItems="stretch" flex={1} minHeight={0}>
      <YStack width={288} flexShrink={0} minHeight={0}>
        {rail}
      </YStack>
      <YStack flex={1} minWidth={0} minHeight={0}>
        {content}
      </YStack>
    </XStack>
  );
}
