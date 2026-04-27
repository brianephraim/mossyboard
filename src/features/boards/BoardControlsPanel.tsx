import type { ReactNode } from "react";
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
}: Readonly<{
  search: BoardDetailSearch;
  onSetView: (view: BoardDetailSearch["view"]) => void;
  onSetGroupBy: (groupBy: BoardDetailSearch["groupBy"]) => void;
  onTogglePriority: (priority: CardPriority) => void;
  onClearPriority: () => void;
  footer?: ReactNode;
}>) {
  const media = useMedia();
  const sectionFontSize = media.maxMd ? "$3" : "$4";
  const surfacePadding = media.maxMd ? "$3" : "$4";
  const rowGap = media.maxMd ? "$2" : "$3";

  return (
    <BoardSurface padding={surfacePadding}>
      <YStack gap={rowGap}>
        <XStack gap={rowGap} flexWrap="wrap" alignItems="center">
          <Text fontSize={sectionFontSize} fontWeight="700" color="$boardHeading">
            View
          </Text>
          <BoardActionButton
            tone={search.view === "board" ? "accent" : "ghost"}
            onPress={() => onSetView("board")}
          >
            Board
          </BoardActionButton>
          <BoardActionButton
            tone={search.view === "list" ? "accent" : "ghost"}
            onPress={() => onSetView("list")}
          >
            List
          </BoardActionButton>

          {search.view === "board" ? (
            <>
              <Text fontSize={sectionFontSize} fontWeight="700" color="$boardHeading">
                Group by
              </Text>
              <BoardActionButton
                tone={search.groupBy === "column" ? "accent" : "ghost"}
                onPress={() => onSetGroupBy("column")}
              >
                User order
              </BoardActionButton>
              <BoardActionButton
                tone={search.groupBy === "priority" ? "accent" : "ghost"}
                onPress={() => onSetGroupBy("priority")}
              >
                Priority
              </BoardActionButton>
            </>
          ) : null}
        </XStack>

        <YStack gap={media.maxMd ? "$1.5" : "$2"}>
          <XStack gap={media.maxMd ? "$1.5" : "$2"} flexWrap="wrap" alignItems="center">
            <Text fontSize={sectionFontSize} fontWeight="700" color="$boardHeading">
              Priority filter
            </Text>
            {(["none", "low", "medium", "high"] as const).map((priority) => {
              const meta = boardPriorityMeta[priority];
              const active = search.priority.includes(priority);

              return (
                <BoardActionButton
                  key={priority}
                  tone={active ? "accent" : "ghost"}
                  onPress={() => onTogglePriority(priority)}
                >
                  {meta.label}
                </BoardActionButton>
              );
            })}
            {search.priority.length > 0 ? (
              <BoardActionButton tone="ghost" onPress={onClearPriority}>
                Clear filters
              </BoardActionButton>
            ) : null}
          </XStack>
        </YStack>

        {footer ? <YStack>{footer}</YStack> : null}
      </YStack>
    </BoardSurface>
  );
}
