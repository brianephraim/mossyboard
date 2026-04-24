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
      boardPageBg: "#f6f3ea",
      boardBackdropTop: "#eef3df",
      boardBackdropBottom: "#dce6c8",
      boardSidebarSurface: "rgba(255, 255, 255, 0.86)",
      boardSidebarBorder: "rgba(95, 119, 66, 0.16)",
      boardShellSurface: "rgba(255, 255, 255, 0.68)",
      boardShellBorder: "rgba(101, 124, 73, 0.18)",
      boardPanelSurface: "rgba(255, 255, 255, 0.92)",
      boardPanelSurfaceStrong: "#ffffff",
      boardHeading: "#1b2515",
      boardTextMuted: "#65725b",
      boardTextSubtle: "#86927b",
      boardAccent: "#5c812e",
      boardAccentHover: "#476723",
      boardAccentSoft: "#e5efcf",
      boardAccentWash: "rgba(92, 129, 46, 0.12)",
      boardLaneSurface: "rgba(255, 255, 255, 0.8)",
      boardLaneBorder: "rgba(108, 128, 80, 0.16)",
      boardCardSurface: "#ffffff",
      boardCardBorder: "rgba(121, 138, 91, 0.16)",
      boardCardShadow: "rgba(81, 102, 57, 0.1)",
      boardPriorityNoneBg: "#f1f0eb",
      boardPriorityNoneText: "#76706a",
      boardPriorityLowBg: "#eef5e1",
      boardPriorityLowText: "#5b7f2e",
      boardPriorityMediumBg: "#fff4d8",
      boardPriorityMediumText: "#a96f12",
      boardPriorityHighBg: "#ffe6df",
      boardPriorityHighText: "#b84b31",
      boardWarningBg: "#fff7e3",
      boardWarningText: "#815f11",
      boardDangerBg: "#fff0eb",
      boardDangerText: "#a1402f",
      boardSuccessBg: "#ecf7ec",
      boardSuccessText: "#2f6e3d",
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
      boardShell: 28,
      boardRail: 30,
      boardPanel: 24,
      boardCard: 22,
      boardPill: 999,
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
