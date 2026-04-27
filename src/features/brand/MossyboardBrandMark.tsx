import { useEffect, useRef, useState, type CSSProperties, type ComponentProps } from "react";
import { Stack, Text } from "@tamagui/core";

import mossyboardIconUrl from "../../assets/branding/mossyboard-icon.png";
import { brandTextFontFamily } from "../../tamagui/fontFamilies";

import "./MossyboardBrandMark.css";

type FloatingCounter = Readonly<{
  id: number;
  value: number;
  className: string;
  durationMs: number;
  style: FloatingCounterStyle;
}>;

type FloatingCounterStyle = CSSProperties & {
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
    const reducedStyle: FloatingCounterStyle = {
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
      value,
      className: "mossyboardBrandMarkCounter mossyboardBrandMarkCounterReduced",
      durationMs: 280,
      style: reducedStyle,
    } satisfies FloatingCounter;
  }

  const sign = id % 2 === 0 ? 1 : -1;
  const sway = 10 + (id % 3) * 3;
  const lateSway = Math.round(sway * 0.55);
  const settleSway = Math.max(2, Math.round(sway * 0.22));
  const tilt = 6 + (id % 2) * 2;

  const style: FloatingCounterStyle = {
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
    value,
    className: "mossyboardBrandMarkCounter mossyboardBrandMarkCounterFloat",
    durationMs: 980,
    style,
  } satisfies FloatingCounter;
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
  const nextFloatingCounterIdRef = useRef(0);
  const floatingCounterTimeoutsRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [animationSeed, setAnimationSeed] = useState(0);
  const [floatingCounters, setFloatingCounters] = useState<readonly FloatingCounter[]>([]);

  useEffect(() => {
    return () => {
      for (const timeoutId of floatingCounterTimeoutsRef.current) {
        clearTimeout(timeoutId);
      }
      floatingCounterTimeoutsRef.current.clear();
    };
  }, []);

  const playCelebration = () => {
    directionRef.current = directionRef.current === 1 ? -1 : 1;
    setAnimationSeed((currentSeed) => currentSeed + 1);
    totalClicksRef.current += 1;
    const nextCounterId = nextFloatingCounterIdRef.current;
    const floatingCounter = buildFloatingCounter(
      nextCounterId,
      totalClicksRef.current,
      prefersReducedMotion,
    );

    nextFloatingCounterIdRef.current += 1;
    setFloatingCounters((currentCounters) => [...currentCounters, floatingCounter]);

    const timeoutId = setTimeout(() => {
      floatingCounterTimeoutsRef.current.delete(timeoutId);
      setFloatingCounters((currentCounters) =>
        currentCounters.filter((currentCounter) => currentCounter.id !== floatingCounter.id),
      );
    }, floatingCounter.durationMs);

    floatingCounterTimeoutsRef.current.add(timeoutId);
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
        {floatingCounters.map((counter) => (
          <Text
            key={counter.id}
            className={counter.className}
            style={counter.style}
            position="absolute"
            left="50%"
            top="50%"
            fontFamily={brandTextFontFamily}
            fontSize={Math.max(20, Math.round(size * 0.38))}
            fontWeight="400"
            color="#f8fff0"
            lineHeight={Math.max(20, Math.round(size * 0.38))}
            pointerEvents="none"
          >
            {counter.value}
          </Text>
        ))}
      </Stack>
    </Stack>
  );
}
