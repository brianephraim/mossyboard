import { useEffect, useState, type ReactNode } from "react";
import { Dialog } from "@tamagui/dialog";
import { Text, useMedia } from "@tamagui/core";
import { Button } from "@tamagui/button";
import { XStack, YStack } from "@tamagui/stacks";

type PrettyModalWrapProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  fullScreenOnMobile?: boolean;
  preventOutsideClose?: boolean;
  closeLabel?: string;
  desktopPlacement?: "center" | "side";
  desktopWidth?: number;
};

export function PrettyModalWrap({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  fullScreenOnMobile = true,
  preventOutsideClose = false,
  closeLabel = "Close",
  desktopPlacement = "center",
  desktopWidth,
}: Readonly<PrettyModalWrapProps>) {
  const media = useMedia();
  const [didHydrate, setDidHydrate] = useState(false);
  const fullScreen = fullScreenOnMobile && media.maxMd;
  const showAsSidePanel = !fullScreen && desktopPlacement === "side";
  const resolvedDesktopWidth = desktopWidth ?? (showAsSidePanel ? 560 : 720);

  useEffect(() => {
    setDidHydrate(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      {didHydrate ? (
        <Dialog.Portal>
          <Dialog.Overlay
            animation="quick"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            backgroundColor="rgba(12, 23, 10, 0.45)"
          />
          <Dialog.Content
            bordered
            elevate
            animation="quick"
            enterStyle={{ opacity: 0, y: 12, scale: 0.98 }}
            exitStyle={{ opacity: 0, y: 12, scale: 0.98 }}
            backgroundColor="$color1"
            borderColor="$boardShellBorder"
            borderRadius={fullScreen || showAsSidePanel ? 0 : "$10"}
            width={fullScreen ? "100%" : resolvedDesktopWidth}
            maxWidth="92%"
            maxHeight={fullScreen || showAsSidePanel ? "100%" : "92vh"}
            height={fullScreen || showAsSidePanel ? "100%" : "auto"}
            padding="$5"
            gap="$4"
            position={showAsSidePanel ? "absolute" : "relative"}
            top={showAsSidePanel ? 0 : undefined}
            right={showAsSidePanel ? 0 : undefined}
            bottom={showAsSidePanel ? 0 : undefined}
            left={showAsSidePanel ? "auto" : undefined}
            marginLeft={showAsSidePanel ? "auto" : undefined}
            onPointerDownOutside={
              preventOutsideClose
                ? (event) => {
                    event.preventDefault();
                  }
                : undefined
            }
            onInteractOutside={
              preventOutsideClose
                ? (event) => {
                    event.preventDefault();
                  }
                : undefined
            }
          >
            <YStack gap="$4" flex={1}>
              <XStack
                gap="$4"
                justifyContent="space-between"
                alignItems="flex-start"
                flexWrap="wrap"
              >
                <YStack gap="$2" flex={1} minWidth={0}>
                  <Dialog.Title unstyled>
                    <Text fontSize="$8" fontWeight="700" color="$boardHeading">
                      {title}
                    </Text>
                  </Dialog.Title>
                  {description ? (
                    <Dialog.Description unstyled>
                      <Text color="$boardTextMuted" lineHeight="$4">
                        {description}
                      </Text>
                    </Dialog.Description>
                  ) : null}
                </YStack>
                <Dialog.Close asChild>
                  <Button
                    size="$3"
                    chromeless
                    backgroundColor="transparent"
                    color="$boardTextMuted"
                    aria-label={closeLabel}
                  >
                    {closeLabel}
                  </Button>
                </Dialog.Close>
              </XStack>

              <YStack
                flex={1}
                gap="$4"
                minHeight={0}
                overflow={fullScreen || showAsSidePanel ? "scroll" : "visible"}
              >
                {children}
              </YStack>

              {footer ? (
                <XStack gap="$3" flexWrap="wrap" justifyContent="flex-end">
                  {footer}
                </XStack>
              ) : null}
            </YStack>
          </Dialog.Content>
        </Dialog.Portal>
      ) : null}
    </Dialog>
  );
}
