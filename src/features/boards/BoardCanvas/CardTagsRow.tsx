import { useMemo, useState } from "react";
import type { ComponentProps, MouseEvent as ReactMouseEvent } from "react";
import { Button } from "@tamagui/button";
import { Text, Theme } from "@tamagui/core";
import { Input } from "@tamagui/input";
import { Popover } from "@tamagui/popover";
import { XStack, YStack } from "@tamagui/stacks";

import { tamaguiInputValueOnChange } from "../../../tamaguiRhfWebField";
import { getTagSwatch } from "../tagPalette";
import { BoardActionButton } from "../ui";
import { useDragSafePress } from "./useDragSafePress";

export type CardTagsRowTag = {
  id: string;
  name: string;
  normalizedName: string;
};

type Props = Readonly<{
  attachedTags: ReadonlyArray<CardTagsRowTag>;
  availableTags: ReadonlyArray<CardTagsRowTag>;
  onAddTag: (name: string) => Promise<void> | void;
  onDetachTag: (tagId: string) => Promise<void> | void;
}>;

type SwatchToken = ComponentProps<typeof XStack>["backgroundColor"];
type TextToken = ComponentProps<typeof Text>["color"];

export function CardTagsRow({ attachedTags, availableTags, onAddTag, onDetachTag }: Props) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const press = useDragSafePress({
    onActivate: () => setPopoverOpen(true),
  });

  const attachedIds = useMemo(() => new Set(attachedTags.map((tag) => tag.id)), [attachedTags]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return availableTags;
    return availableTags.filter((tag) => tag.normalizedName.includes(q));
  }, [availableTags, query]);

  const submitAdd = async () => {
    const name = query.trim();
    if (name.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onAddTag(name);
      setQuery("");
      setPopoverOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClickExisting = async (tag: CardTagsRowTag) => {
    if (attachedIds.has(tag.id) || submitting) return;
    setSubmitting(true);
    try {
      await onAddTag(tag.name);
      setPopoverOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <XStack gap="$2" flexWrap="wrap" alignItems="center">
      <Theme name="light">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen} placement="bottom-start">
          <Popover.Anchor asChild>
            <BoardActionButton
              aria-label="Add tag"
              tone="ghost"
              paddingHorizontal="$3"
              paddingVertical="$2"
              minHeight={0}
              height="auto"
              onMouseDown={press.onMouseDown}
              onPress={() => setPopoverOpen(true)}
            >
              +
            </BoardActionButton>
          </Popover.Anchor>

          <Popover.Content
            elevate
            padding="$3"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$boardShellBorder"
            backgroundColor="$boardShellSurface"
            gap="$2"
            width={280}
            zIndex={1000}
          >
            <Popover.Arrow borderWidth={1} borderColor="$boardShellBorder" />
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="700" color="$boardHeading">
                Tags
              </Text>
              <XStack gap="$2">
                <Input
                  value={query}
                  onChange={tamaguiInputValueOnChange(setQuery)}
                  placeholder="Find or create…"
                  flex={1}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitAdd();
                    }
                  }}
                  backgroundColor="$boardPanelSurfaceStrong"
                  borderColor="$boardShellBorder"
                />
                <BoardActionButton
                  tone="accent"
                  disabled={query.trim().length === 0 || submitting}
                  onPress={() => void submitAdd()}
                >
                  Add
                </BoardActionButton>
              </XStack>
              <YStack gap="$1" maxHeight={240}>
                {filtered.map((tag) => {
                  const isAttached = attachedIds.has(tag.id);
                  const swatch = getTagSwatch(tag.normalizedName);
                  return (
                    <BoardActionButton
                      key={tag.id}
                      tone={isAttached ? "accent" : "ghost"}
                      disabled={isAttached || submitting}
                      onPress={() => void handleClickExisting(tag)}
                      justifyContent="flex-start"
                    >
                      <XStack alignItems="center" gap="$2">
                        <YStack
                          width={10}
                          height={10}
                          borderRadius="$1"
                          backgroundColor={swatch.backgroundColor as SwatchToken}
                        />
                        <Text>{tag.name}</Text>
                      </XStack>
                    </BoardActionButton>
                  );
                })}
                {filtered.length === 0 && query.length > 0 ? (
                  <Text color="$boardTextMuted" fontSize="$2">
                    No matches. Press Add to create &quot;{query.trim()}&quot;.
                  </Text>
                ) : null}
              </YStack>
            </YStack>
          </Popover.Content>
        </Popover>
      </Theme>

      {attachedTags.map((tag) => {
        const swatch = getTagSwatch(tag.normalizedName);
        return (
          <XStack
            key={tag.id}
            alignItems="center"
            gap="$2"
            backgroundColor={swatch.backgroundColor as SwatchToken}
            paddingLeft="$2"
            paddingRight="$1"
            paddingVertical="$1"
            borderRadius="$3"
          >
            <Text color={swatch.textColor as TextToken} fontSize="$2" fontWeight="600">
              {tag.name}
            </Text>
            <Button
              size="$1"
              circular
              chromeless
              aria-label={`Remove tag ${tag.name}`}
              onMouseDown={(event: ReactMouseEvent) => event.stopPropagation()}
              onPress={() => void onDetachTag(tag.id)}
            >
              ×
            </Button>
          </XStack>
        );
      })}
    </XStack>
  );
}
