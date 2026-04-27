import { useEffect, useRef, useState, type CSSProperties, type ComponentProps } from "react";
import { Stack, Text } from "@tamagui/core";

import mossyboardIconUrl from "../../assets/branding/mossyboard-icon.png";
import { brandTextFontFamily } from "../../tamagui/fontFamilies";

import "./MossyboardBrandMark.css";

type FloatingCelebrationTone = "count" | "message";

type FloatingCelebration = Readonly<{
  id: number;
  label: string;
  className: string;
  durationMs: number;
  tone: FloatingCelebrationTone;
  style: FloatingCelebrationStyle;
}>;

type FloatingCelebrationStyle = CSSProperties & {
  "--mossyboard-counter-duration": string;
  "--mossyboard-counter-early-x": string;
  "--mossyboard-counter-mid-x": string;
  "--mossyboard-counter-late-x": string;
  "--mossyboard-counter-end-x": string;
  "--mossyboard-counter-early-rotate": string;
  "--mossyboard-counter-mid-rotate": string;
  "--mossyboard-counter-late-rotate": string;
  "--mossyboard-counter-end-rotate": string;
};

const encouragementMessages = [
  "keep going!",
  "heck yes!",
  "leaf on!",
  "moss boss!",
  "tiny triumph!",
  "go goblin!",
  "soft flex!",
  "sprout mode!",
  "nice click!",
  "green light!",
  "click magic!",
  "joy unlocked!",
  "still cooking!",
  "gold star!",
  "you rock!",
  "minty move!",
  "fresh bounce!",
  "bravo blob!",
  "zoom zoom!",
  "so good!",
] as const;

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

function buildFloatingCounter(id: number, value: number, prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    const reducedStyle: FloatingCelebrationStyle = {
      "--mossyboard-counter-duration": "280ms",
      "--mossyboard-counter-early-x": "0px",
      "--mossyboard-counter-mid-x": "0px",
      "--mossyboard-counter-late-x": "0px",
      "--mossyboard-counter-end-x": "0px",
      "--mossyboard-counter-early-rotate": "0deg",
      "--mossyboard-counter-mid-rotate": "0deg",
      "--mossyboard-counter-late-rotate": "0deg",
      "--mossyboard-counter-end-rotate": "0deg",
    };

    return {
      id,
      label: String(value),
      className: "mossyboardBrandMarkCounter mossyboardBrandMarkCounterReduced",
      durationMs: 280,
      tone: "count",
      style: reducedStyle,
    } satisfies FloatingCelebration;
  }

  const sign = id % 2 === 0 ? 1 : -1;
  const sway = 10 + (id % 3) * 3;
  const lateSway = Math.round(sway * 0.55);
  const settleSway = Math.max(2, Math.round(sway * 0.22));
  const tilt = 6 + (id % 2) * 2;

  const style: FloatingCelebrationStyle = {
    "--mossyboard-counter-duration": "980ms",
    "--mossyboard-counter-early-x": `${sign * Math.round(sway * 0.28)}px`,
    "--mossyboard-counter-mid-x": `${sign * sway}px`,
    "--mossyboard-counter-late-x": `${sign * -lateSway}px`,
    "--mossyboard-counter-end-x": `${sign * settleSway}px`,
    "--mossyboard-counter-early-rotate": `${sign * Math.round(tilt * 0.35)}deg`,
    "--mossyboard-counter-mid-rotate": `${sign * tilt}deg`,
    "--mossyboard-counter-late-rotate": `${sign * -Math.max(3, tilt - 2)}deg`,
    "--mossyboard-counter-end-rotate": `${sign * Math.max(1, tilt - 4)}deg`,
  };

  return {
    id,
    label: String(value),
    className: "mossyboardBrandMarkCounter mossyboardBrandMarkCounterFloat",
    durationMs: 980,
    tone: "count",
    style,
  } satisfies FloatingCelebration;
}

function buildFloatingMessage(id: number, message: string, prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    const reducedStyle: FloatingCelebrationStyle = {
      "--mossyboard-counter-duration": "420ms",
      "--mossyboard-counter-early-x": "0px",
      "--mossyboard-counter-mid-x": "0px",
      "--mossyboard-counter-late-x": "0px",
      "--mossyboard-counter-end-x": "0px",
      "--mossyboard-counter-early-rotate": "0deg",
      "--mossyboard-counter-mid-rotate": "0deg",
      "--mossyboard-counter-late-rotate": "0deg",
      "--mossyboard-counter-end-rotate": "0deg",
    };

    return {
      id,
      label: message,
      className:
        "mossyboardBrandMarkCounter mossyboardBrandMarkCounterMessage mossyboardBrandMarkCounterReduced",
      durationMs: 420,
      tone: "message",
      style: reducedStyle,
    } satisfies FloatingCelebration;
  }

  const sign = id % 2 === 0 ? -1 : 1;
  const sway = 16 + (id % 4) * 4;
  const lateSway = Math.round(sway * 0.65);
  const settleSway = Math.max(3, Math.round(sway * 0.3));
  const tilt = 4 + (id % 3) * 2;

  const style: FloatingCelebrationStyle = {
    "--mossyboard-counter-duration": "1480ms",
    "--mossyboard-counter-early-x": `${sign * Math.round(sway * 0.24)}px`,
    "--mossyboard-counter-mid-x": `${sign * sway}px`,
    "--mossyboard-counter-late-x": `${sign * -lateSway}px`,
    "--mossyboard-counter-end-x": `${sign * settleSway}px`,
    "--mossyboard-counter-early-rotate": `${sign * Math.max(1, Math.round(tilt * 0.3))}deg`,
    "--mossyboard-counter-mid-rotate": `${sign * tilt}deg`,
    "--mossyboard-counter-late-rotate": `${sign * -Math.max(2, tilt - 1)}deg`,
    "--mossyboard-counter-end-rotate": `${sign * Math.max(1, tilt - 3)}deg`,
  };

  return {
    id,
    label: message,
    className:
      "mossyboardBrandMarkCounter mossyboardBrandMarkCounterMessage mossyboardBrandMarkCounterFloat",
    durationMs: 1480,
    tone: "message",
    style,
  } satisfies FloatingCelebration;
}

export function MossyboardBrandMark({
  size = 48,
  backgroundColor = "$boardAccentSoft",
  focusRingColor = "$boardAccent",
  ariaLabel = "Make the Mossyboard logo bounce",
}: MossyboardBrandMarkProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const directionRef = useRef<1 | -1>(-1);
  const totalClicksRef = useRef(0);
  const lastEncouragementIndexRef = useRef<number | null>(null);
  const nextFloatingCelebrationIdRef = useRef(0);
  const floatingCelebrationTimeoutsRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [animationSeed, setAnimationSeed] = useState(0);
  const [floatingCelebrations, setFloatingCelebrations] = useState<readonly FloatingCelebration[]>(
    [],
  );

  useEffect(() => {
    const timeouts = floatingCelebrationTimeoutsRef.current;
    return () => {
      for (const timeoutId of timeouts) {
        clearTimeout(timeoutId);
      }
      timeouts.clear();
    };
  }, []);

  const removeFloatingCelebration = (celebrationId: number) => {
    setFloatingCelebrations((currentCelebrations) =>
      currentCelebrations.filter((currentCelebration) => currentCelebration.id !== celebrationId),
    );
  };

  const scheduleFloatingCelebration = (celebration: FloatingCelebration, delayMs = 0) => {
    const spawnCelebration = () => {
      setFloatingCelebrations((currentCelebrations) => [...currentCelebrations, celebration]);

      const removalTimeoutId = setTimeout(() => {
        floatingCelebrationTimeoutsRef.current.delete(removalTimeoutId);
        removeFloatingCelebration(celebration.id);
      }, celebration.durationMs);

      floatingCelebrationTimeoutsRef.current.add(removalTimeoutId);
    };

    if (delayMs === 0) {
      spawnCelebration();
      return;
    }

    const delayTimeoutId = setTimeout(() => {
      floatingCelebrationTimeoutsRef.current.delete(delayTimeoutId);
      spawnCelebration();
    }, delayMs);

    floatingCelebrationTimeoutsRef.current.add(delayTimeoutId);
  };

  const getRandomEncouragementMessage = () => {
    let nextIndex = Math.floor(Math.random() * encouragementMessages.length);

    if (lastEncouragementIndexRef.current === nextIndex) {
      nextIndex = (nextIndex + 1 + (totalClicksRef.current % 3)) % encouragementMessages.length;
    }

    lastEncouragementIndexRef.current = nextIndex;
    return encouragementMessages[nextIndex];
  };

  const playCelebration = () => {
    directionRef.current = directionRef.current === 1 ? -1 : 1;
    setAnimationSeed((currentSeed) => currentSeed + 1);
    totalClicksRef.current += 1;
    const floatingCounter = buildFloatingCounter(
      nextFloatingCelebrationIdRef.current,
      totalClicksRef.current,
      prefersReducedMotion,
    );

    nextFloatingCelebrationIdRef.current += 1;
    scheduleFloatingCelebration(floatingCounter);

    if (totalClicksRef.current % 10 === 0) {
      const encouragementMessage = buildFloatingMessage(
        nextFloatingCelebrationIdRef.current,
        getRandomEncouragementMessage(),
        prefersReducedMotion,
      );

      nextFloatingCelebrationIdRef.current += 1;
      scheduleFloatingCelebration(encouragementMessage, prefersReducedMotion ? 80 : 140);
    }
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
      position="relative"
      borderRadius={9999}
      backgroundColor={backgroundColor}
      cursor="pointer"
      overflow="visible"
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
      <Stack position="absolute" inset={0} pointerEvents="none" overflow="visible" aria-hidden>
        {floatingCelebrations.map((celebration) => {
          const isMessage = celebration.tone === "message";

          return (
            <Text
              key={celebration.id}
              className={celebration.className}
              style={celebration.style}
              position="absolute"
              left="50%"
              top="50%"
              fontFamily={brandTextFontFamily}
              fontSize={
                isMessage
                  ? Math.max(16, Math.round(size * 0.28))
                  : Math.max(20, Math.round(size * 0.38))
              }
              fontWeight="400"
              color="#f8fff0"
              lineHeight={
                isMessage
                  ? Math.max(18, Math.round(size * 0.32))
                  : Math.max(20, Math.round(size * 0.38))
              }
              letterSpacing={isMessage ? 0.2 : 0}
              textAlign="center"
              maxWidth={isMessage ? Math.max(108, Math.round(size * 3.2)) : undefined}
              pointerEvents="none"
            >
              {celebration.label}
            </Text>
          );
        })}
      </Stack>
    </Stack>
  );
}
