import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Stack } from "@tamagui/core";

import mossyboardIconUrl from "../../assets/branding/mossyboard-icon.png";

import "./MossyboardBrandMark.css";

export type MossyboardBrandMarkProps = Readonly<{
  size?: number;
  backgroundColor?: ComponentProps<typeof Stack>["backgroundColor"];
  focusRingColor?: ComponentProps<typeof Stack>["outlineColor"];
  ariaLabel?: string;
}>;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

function getAnimationClassName({
  animationSeed,
  direction,
  prefersReducedMotion,
}: Readonly<{
  animationSeed: number;
  direction: 1 | -1;
  prefersReducedMotion: boolean;
}>) {
  if (animationSeed === 0) {
    return "mossyboardBrandMarkButton";
  }

  if (prefersReducedMotion) {
    return direction === 1
      ? "mossyboardBrandMarkButton mossyboardBrandMarkButtonReducedClockwise"
      : "mossyboardBrandMarkButton mossyboardBrandMarkButtonReducedCounterClockwise";
  }

  return direction === 1
    ? "mossyboardBrandMarkButton mossyboardBrandMarkButtonSpringClockwise"
    : "mossyboardBrandMarkButton mossyboardBrandMarkButtonSpringCounterClockwise";
}

export function MossyboardBrandMark({
  size = 48,
  backgroundColor = "$boardAccentSoft",
  focusRingColor = "$boardAccent",
  ariaLabel = "Make the Mossyboard logo bounce",
}: MossyboardBrandMarkProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const directionRef = useRef<1 | -1>(-1);
  const [animationSeed, setAnimationSeed] = useState(0);

  const playCelebration = () => {
    directionRef.current = directionRef.current === 1 ? -1 : 1;
    setAnimationSeed((currentSeed) => currentSeed + 1);
  };

  return (
    <Stack
      tag="button"
      className={getAnimationClassName({
        animationSeed,
        direction: directionRef.current,
        prefersReducedMotion,
      })}
      width={size}
      height={size}
      padding={0}
      borderWidth={0}
      borderRadius={9999}
      backgroundColor={backgroundColor}
      cursor="pointer"
      overflow="hidden"
      alignItems="center"
      justifyContent="center"
      hoverStyle={{ opacity: 0.94 }}
      pressStyle={{ opacity: 0.98 }}
      focusStyle={{
        outlineWidth: 2,
        outlineStyle: "solid",
        outlineColor: focusRingColor,
        outlineOffset: 2,
      }}
      onPress={playCelebration}
      aria-label={ariaLabel}
    >
      <Stack
        width={size}
        height={size}
        borderRadius={9999}
        className="mossyboardBrandMarkSurface"
        backgroundImage={`url(${mossyboardIconUrl})`}
        backgroundSize="cover"
        backgroundPosition="center"
        backgroundRepeat="no-repeat"
        pointerEvents="none"
      />
    </Stack>
  );
}
