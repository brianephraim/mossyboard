import type { ComponentProps, ReactNode } from "react";
import { Button } from "@tamagui/button";
import { LinearGradient } from "@tamagui/linear-gradient";
import { Stack, Text, Theme, useMedia } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { boardPriorityMeta } from "./model";
import type { CardPriority } from "./types";

const pageBackground =
  "linear-gradient(180deg, var(--c-color-boardPageBg) 0%, rgba(246, 243, 234, 0.96) 45%, rgba(236, 241, 223, 0.82) 100%)";

export function BoardPageChrome({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Theme name="light">
      <YStack
        minHeight="100vh"
        backgroundImage={pageBackground}
        position="relative"
        overflow="hidden"
      >
        <BoardBackdropArt />
        <YStack position="relative" zIndex={1} minHeight="100vh">
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
        colors={["rgba(238, 243, 223, 0.95)", "rgba(220, 230, 200, 0.45)"]}
      />
      <Stack
        position="absolute"
        left={-120}
        bottom={-220}
        width={520}
        height={520}
        borderRadius={9999}
        backgroundColor="rgba(145, 168, 108, 0.12)"
        transform="rotate(-10deg)"
      />
      <Stack
        position="absolute"
        right={-80}
        bottom={-180}
        width={460}
        height={460}
        borderRadius={9999}
        backgroundColor="rgba(132, 161, 92, 0.1)"
      />
      <Stack
        position="absolute"
        right={120}
        top={88}
        width={240}
        height={240}
        borderRadius={9999}
        backgroundColor="rgba(231, 237, 215, 0.42)"
      />
    </>
  );
}

export function BoardSurface({
  children,
  padding = "$5",
}: Readonly<{ children: ReactNode; padding?: ComponentProps<typeof YStack>["padding"] }>) {
  return (
    <YStack
      backgroundColor="$boardShellSurface"
      borderWidth={1}
      borderColor="$boardShellBorder"
      borderRadius="$boardShell"
      padding={padding}
      gap="$4"
      boxShadow="rgba(89, 103, 62, 0.08) 0px 20px 60px"
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
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}>) {
  return (
    <XStack justifyContent="space-between" alignItems="flex-start" gap="$4" flexWrap="wrap">
      <YStack gap="$2" maxWidth={760}>
        {eyebrow ? (
          <Text
            textTransform="uppercase"
            letterSpacing={1.5}
            fontSize="$2"
            color="$boardTextSubtle"
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text tag="h1" fontSize="$10" fontWeight="800" color="$boardHeading" lineHeight="$9">
          {title}
        </Text>
        {subtitle ? (
          <Text fontSize="$5" color="$boardTextMuted" maxWidth={760}>
            {subtitle}
          </Text>
        ) : null}
      </YStack>
      {actions ? (
        <XStack gap="$3" flexWrap="wrap" justifyContent="flex-end">
          {actions}
        </XStack>
      ) : null}
    </XStack>
  );
}

export function BoardActionButton({
  children,
  tone = "default",
  ...props
}: Readonly<
  {
    children: ReactNode;
    tone?: "default" | "accent" | "danger" | "ghost";
  } & ComponentProps<typeof Button>
>) {
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
      size="$3"
      borderRadius="$10"
      borderWidth={1}
      paddingHorizontal="$4"
      fontWeight="600"
      {...styles}
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
      <YStack gap="$4" padding="$4">
        {rail}
        {content}
      </YStack>
    );
  }

  return (
    <XStack gap="$4" padding="$4" alignItems="stretch">
      <YStack width={288} flexShrink={0}>
        {rail}
      </YStack>
      <YStack flex={1} minWidth={0}>
        {content}
      </YStack>
    </XStack>
  );
}
