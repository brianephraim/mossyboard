import type { ComponentProps, ReactNode } from "react";
import { Text, useMedia } from "@tamagui/core";
import { XStack, YStack } from "@tamagui/stacks";

import { boardPriorityMeta } from "./model";
import type { BoardDetailSearch, CardPriority } from "./types";
import { BoardActionButton, BoardSurface } from "./ui";

export function BoardControlsPanel({
  search,
  onSetView,
  onSetGroupBy,
  onTogglePriority,
  onClearPriority,
  footer,
  variant = "default",
}: Readonly<{
  search: BoardDetailSearch;
  onSetView: (view: BoardDetailSearch["view"]) => void;
  onSetGroupBy: (groupBy: BoardDetailSearch["groupBy"]) => void;
  onTogglePriority: (priority: CardPriority) => void;
  onClearPriority: () => void;
  footer?: ReactNode;
  variant?: "default" | "menu";
}>) {
  const media = useMedia();
  const sectionFontSize = media.maxMd ? "$3" : "$4";
  const surfacePadding = media.maxMd ? "$3" : "$4";
  const rowGap = media.maxMd ? "$2" : "$3";
  const isMenu = variant === "menu";
  const sectionLabelColor = isMenu ? "$boardSidebarText" : "$boardHeading";
  const menuGhostButtonProps: Omit<
    ComponentProps<typeof BoardActionButton>,
    "children" | "onPress" | "tone"
  > | null = isMenu
    ? {
        color: "$boardSidebarText",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderColor: "$boardSidebarBorder",
        hoverStyle: { backgroundColor: "$boardSidebarRowBg" },
        pressStyle: { backgroundColor: "$boardSidebarRowBg", opacity: 0.92 },
      }
    : null;

  const viewButtons = (
    <>
      <BoardActionButton
        tone={search.view === "board" ? "accent" : "ghost"}
        {...(search.view === "board" ? undefined : (menuGhostButtonProps ?? undefined))}
        onPress={() => onSetView("board")}
      >
        Board
      </BoardActionButton>
      <BoardActionButton
        tone={search.view === "list" ? "accent" : "ghost"}
        {...(search.view === "list" ? undefined : (menuGhostButtonProps ?? undefined))}
        onPress={() => onSetView("list")}
      >
        List
      </BoardActionButton>
    </>
  );

  const groupButtons =
    search.view === "board" ? (
      <>
        <BoardActionButton
          tone={search.groupBy === "column" ? "accent" : "ghost"}
          {...(search.groupBy === "column" ? undefined : (menuGhostButtonProps ?? undefined))}
          onPress={() => onSetGroupBy("column")}
        >
          User order
        </BoardActionButton>
        <BoardActionButton
          tone={search.groupBy === "priority" ? "accent" : "ghost"}
          {...(search.groupBy === "priority" ? undefined : (menuGhostButtonProps ?? undefined))}
          onPress={() => onSetGroupBy("priority")}
        >
          Priority
        </BoardActionButton>
      </>
    ) : null;

  const priorityButtons = (
    <>
      {(["none", "low", "medium", "high"] as const).map((priority) => {
        const meta = boardPriorityMeta[priority];
        const active = search.priority.includes(priority);

        return (
          <BoardActionButton
            key={priority}
            tone={active ? "accent" : "ghost"}
            {...(active ? undefined : (menuGhostButtonProps ?? undefined))}
            onPress={() => onTogglePriority(priority)}
          >
            {meta.label}
          </BoardActionButton>
        );
      })}
      {search.priority.length > 0 ? (
        <BoardActionButton
          tone="ghost"
          {...(menuGhostButtonProps ?? undefined)}
          onPress={onClearPriority}
        >
          Clear filters
        </BoardActionButton>
      ) : null}
    </>
  );

  if (isMenu) {
    return (
      <YStack gap="$4">
        <YStack gap="$2.5">
          <Text fontSize={sectionFontSize} fontWeight="700" color={sectionLabelColor}>
            View
          </Text>
          <XStack gap={rowGap} flexWrap="wrap" alignItems="center">
            {viewButtons}
          </XStack>
        </YStack>

        {search.view === "board" ? (
          <YStack gap="$2.5">
            <Text fontSize={sectionFontSize} fontWeight="700" color={sectionLabelColor}>
              Group by
            </Text>
            <XStack gap={rowGap} flexWrap="wrap" alignItems="center">
              {groupButtons}
            </XStack>
          </YStack>
        ) : null}

        <YStack gap="$2.5">
          <Text fontSize={sectionFontSize} fontWeight="700" color={sectionLabelColor}>
            Priority filter
          </Text>
          <XStack gap={media.maxMd ? "$1.5" : "$2"} flexWrap="wrap" alignItems="center">
            {priorityButtons}
          </XStack>
        </YStack>

        {footer ? <YStack>{footer}</YStack> : null}
      </YStack>
    );
  }

  return (
    <BoardSurface padding={surfacePadding}>
      <YStack gap={rowGap}>
        <XStack gap={rowGap} flexWrap="wrap" alignItems="center">
          <Text fontSize={sectionFontSize} fontWeight="700" color="$boardHeading">
            View
          </Text>
          {viewButtons}

          {search.view === "board" ? (
            <>
              <Text fontSize={sectionFontSize} fontWeight="700" color="$boardHeading">
                Group by
              </Text>
              {groupButtons}
            </>
          ) : null}
        </XStack>

        <YStack gap={media.maxMd ? "$1.5" : "$2"}>
          <XStack gap={media.maxMd ? "$1.5" : "$2"} flexWrap="wrap" alignItems="center">
            <Text fontSize={sectionFontSize} fontWeight="700" color="$boardHeading">
              Priority filter
            </Text>
            {priorityButtons}
          </XStack>
        </YStack>

        {footer ? <YStack>{footer}</YStack> : null}
      </YStack>
    </BoardSurface>
  );
}
