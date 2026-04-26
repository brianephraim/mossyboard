import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@tamagui/button";
import { Text } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { BoardActionButton, BoardSurface } from "./ui";

const drawerHeightStorageKey = "boardDrawerHeightPx";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBoundsPx() {
  const innerHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const min = Math.min(240, Math.round(innerHeight * 0.25));
  const max = Math.round(innerHeight * 0.9);
  return { min, max };
}

export type BoardDrawerProps = {
  boardId: string;
  boardName: string | null;
  onClose: () => void;
  onPromote: () => void;
  onHeightChange: (px: number) => void;
  children: ReactNode;
};

export function BoardDrawer({
  boardName,
  onClose,
  onPromote,
  onHeightChange,
  children,
}: Readonly<BoardDrawerProps>) {
  const [heightPx, setHeightPx] = useState<number>(() => {
    const raw =
      typeof window === "undefined" ? null : window.localStorage.getItem(drawerHeightStorageKey);
    const parsed = raw ? Number(raw) : NaN;
    const fromStorage = Number.isFinite(parsed) ? parsed : null;
    const innerHeight = typeof window === "undefined" ? 800 : window.innerHeight;
    const initial = fromStorage ?? Math.round(innerHeight * 0.6);
    const { min, max } = getBoundsPx();
    return clamp(initial, min, max);
  });
  const chromeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onHeightChange(heightPx);
  }, [heightPx, onHeightChange]);

  const setHeightClamped = (next: number, persist?: boolean) => {
    const { min, max } = getBoundsPx();
    const clamped = clamp(next, min, max);
    setHeightPx(clamped);
    onHeightChange(clamped);
    if (persist && typeof window !== "undefined") {
      window.localStorage.setItem(drawerHeightStorageKey, String(clamped));
    }
  };

  const onPointerDown = (event: any) => {
    const native = event?.nativeEvent ?? event;
    const target = event?.currentTarget;
    if (!target) {
      return;
    }
    native?.preventDefault?.();
    (target as HTMLElement).setPointerCapture?.(native.pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      const innerHeight = window.innerHeight;
      const nextHeight = innerHeight - moveEvent.clientY;
      setHeightClamped(nextHeight, false);
    };

    const handleUp = (upEvent: PointerEvent) => {
      const innerHeight = window.innerHeight;
      const nextHeight = innerHeight - upEvent.clientY;
      setHeightClamped(nextHeight, true);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <YStack
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      height={heightPx}
      zIndex={20}
      aria-label={boardName ? `Drawer: ${boardName}` : "Drawer"}
      borderTopLeftRadius="$8"
      borderTopRightRadius="$8"
      overflow="hidden"
      boxShadow="rgba(27, 37, 21, 0.18) 0px -24px 60px"
    >
      <BoardSurface
        padding="$0"
        flex={1}
        minHeight={0}
        borderBottomLeftRadius={0}
        borderBottomRightRadius={0}
        position="relative"
        backgroundColor="$boardPanelSurfaceStrong"
        boxShadow="none"
      >
        <Button
          chromeless
          unstyled
          aria-label="Resize drawer"
          onPointerDown={onPointerDown}
          cursor="ns-resize"
          position="absolute"
          top="$2"
          left="50%"
          transform={[{ translateX: "-50%" }]}
          padding={0}
          height={24}
          width={72}
          borderRadius="$10"
          hoverStyle={{ backgroundColor: "transparent", opacity: 0.9 }}
          pressStyle={{ backgroundColor: "transparent", opacity: 0.85 }}
          focusStyle={{ outlineWidth: 0 }}
          focusVisibleStyle={{
            outlineColor: "$boardAccent",
            outlineWidth: 2,
            outlineStyle: "solid",
          }}
          zIndex={2}
        >
          <YStack
            width={44}
            height={5}
            borderRadius={9999}
            backgroundColor="$boardTextSubtle"
            opacity={0.55}
          />
        </Button>

        <XStack
          ref={chromeRef}
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$4"
          height={44}
          paddingTop="$2"
          borderColor="$boardShellBorder"
          gap="$3"
        >
          <XStack alignItems="center" gap="$3" minWidth={0} flex={1}>
            <Button
              chromeless
              onPress={onPromote}
              aria-label={
                boardName ? `Promote ${boardName} to main` : "Promote drawer board to main"
              }
            >
              <Text fontWeight="800" color="$boardHeading" numberOfLines={1}>
                {boardName ?? "Loading…"}
              </Text>
            </Button>
          </XStack>

          <XStack gap="$2" alignItems="center">
            <BoardActionButton tone="ghost" onPress={onPromote}>
              Promote to main
            </BoardActionButton>
            <BoardActionButton aria-label="Close drawer" tone="ghost" onPress={onClose}>
              Close
            </BoardActionButton>
          </XStack>
        </XStack>

        <YStack flex={1} minHeight={0}>
          {children}
        </YStack>
      </BoardSurface>
    </YStack>
  );
}
