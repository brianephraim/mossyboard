import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@tamagui/button";
import { Stack, Text } from "@tamagui/core";
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

  const bounds = useMemo(() => getBoundsPx(), []);

  const setHeightClamped = (next: number, persist?: boolean) => {
    const { min, max } = getBoundsPx();
    const clamped = clamp(next, min, max);
    setHeightPx(clamped);
    onHeightChange(clamped);
    if (persist && typeof window !== "undefined") {
      window.localStorage.setItem(drawerHeightStorageKey, String(clamped));
    }
  };

  const onPointerDown: React.PointerEventHandler = (event) => {
    if (!event.currentTarget) {
      return;
    }
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

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

  const onHandleKeyDown: React.KeyboardEventHandler = (event) => {
    const step = 32;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHeightClamped(heightPx + step, true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHeightClamped(heightPx - step, true);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setHeightClamped(bounds.min, true);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setHeightClamped(bounds.max, true);
      return;
    }
    if (event.key === "Escape") {
      const active = document.activeElement;
      if (chromeRef.current && active && chromeRef.current.contains(active)) {
        event.preventDefault();
        onClose();
      }
    }
  };

  return (
    <YStack
      position="fixed"
      left={0}
      right={0}
      bottom={0}
      height={heightPx}
      zIndex={20}
      aria-label={boardName ? `Drawer: ${boardName}` : "Drawer"}
      borderTopLeftRadius="$8"
      borderTopRightRadius="$8"
      overflow="hidden"
    >
      <BoardSurface
        padding="$0"
        flex={1}
        minHeight={0}
        borderBottomLeftRadius={0}
        borderBottomRightRadius={0}
      >
        <XStack
          ref={chromeRef}
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$4"
          height={44}
          borderBottomWidth={1}
          borderColor="$boardShellBorder"
          gap="$3"
        >
          <XStack alignItems="center" gap="$3" minWidth={0} flex={1}>
            <Stack
              tabIndex={0}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize drawer"
              aria-valuenow={heightPx}
              aria-valuemin={bounds.min}
              aria-valuemax={bounds.max}
              onPointerDown={onPointerDown}
              onKeyDown={onHandleKeyDown}
              cursor="ns-resize"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$6"
              hoverStyle={{ backgroundColor: "$boardAccentWash" }}
              focusStyle={{ outlineColor: "$boardAccent", outlineWidth: 2, outlineStyle: "solid" }}
            >
              <Text color="$boardTextSubtle" fontWeight="800" aria-hidden>
                ⋯
              </Text>
            </Stack>

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
