import { createTamagui } from "@tamagui/core";
import { defaultConfig } from "@tamagui/config/v4";

const baseTokens = defaultConfig.tokens;

const config = createTamagui({
  ...defaultConfig,
  settings: {
    ...defaultConfig.settings,
    // Root route owns `<html>` / `<body>`; keep Tamagui theme class on the provider subtree.
    themeClassNameOnRoot: false,
  },
  tokens: {
    ...baseTokens,
    color: {
      ...baseTokens.color,
      counterGradientLeft: "#4facfe",
      counterGradientRight: "#9716ff",
      counterCardSurface: "rgba(28, 28, 48, 0.72)",
      counterCardBorder: "rgba(255, 255, 255, 0.12)",
      counterInsetRowBg: "rgba(12, 12, 24, 0.55)",
      counterLabelMuted: "#a0a0c0",
      counterNavLink: "#b8c7ff",
      counterNavChevron: "rgba(255, 255, 255, 0.55)",
      counterIconPurple: "rgba(118, 62, 220, 0.95)",
      counterPageGradLeft: "#1a0a2e",
      counterPageGradMid: "#12182a",
      counterPageGradRight: "#0f172a",
    },
    radius: {
      ...baseTokens.radius,
      counterCard: 30,
      counterButton: 15,
      counterCheckbox: 8,
      counterIcon: 12,
    },
  },
});

export type AppTamaguiConfig = typeof config;

declare module "@tamagui/core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}

export default config;
