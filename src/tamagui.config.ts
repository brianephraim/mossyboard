import { createTamagui } from "@tamagui/core";
import { defaultConfig } from "@tamagui/config/v4";

const baseTokens = defaultConfig.tokens as typeof defaultConfig.tokens & {
  color: Record<string, string>;
};

const media = {
  ...defaultConfig.media,
  maxMd: { maxWidth: 975 },
  md: { minWidth: 976 },
} as const;

const config = createTamagui({
  ...defaultConfig,
  settings: {
    ...defaultConfig.settings,
    // Root route owns `<html>` / `<body>`; keep Tamagui theme class on the provider subtree.
    themeClassNameOnRoot: false,
    onlyAllowShorthands: false,
  },
  media,
  tokens: {
    ...baseTokens,
    color: {
      ...baseTokens.color,
      boardPageBg: "#23301e",
      boardBackdropTop: "#11170f",
      boardBackdropBottom: "#40533a",
      boardSidebarSurface: "#2a3627",
      boardSidebarSurfaceBottom: "#46603d",
      boardSidebarPanelSurface: "rgba(108, 133, 83, 0.18)",
      boardSidebarBorder: "rgba(209, 224, 180, 0.16)",
      boardSidebarPanelBorder: "rgba(216, 229, 192, 0.14)",
      boardSidebarText: "#f3f5ec",
      boardSidebarMuted: "rgba(233, 239, 220, 0.78)",
      boardSidebarSubtle: "rgba(208, 220, 184, 0.62)",
      boardSidebarRowBg: "rgba(79, 104, 58, 0.68)",
      boardSidebarRowHoverBg: "rgba(86, 111, 63, 0.44)",
      boardSidebarRowBorder: "rgba(190, 212, 149, 0.2)",
      boardSidebarGlow: "#c5eb86",
      boardShellSurface: "rgba(248, 248, 242, 0.78)",
      boardShellBorder: "rgba(128, 145, 100, 0.16)",
      boardPanelSurface: "rgba(250, 250, 246, 0.94)",
      boardPanelSurfaceStrong: "#fafaf6",
      boardHeading: "#1b2515",
      boardTextMuted: "#65725b",
      boardTextSubtle: "#86927b",
      boardAccent: "#6f9635",
      boardAccentHover: "#5f802d",
      boardAccentSoft: "#edf5de",
      boardAccentWash: "rgba(111, 150, 53, 0.14)",
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
      boardTagSwatch1Bg: "#fde6e2",
      boardTagSwatch1Text: "#7a2615",
      boardTagSwatch2Bg: "#fdedc7",
      boardTagSwatch2Text: "#754a02",
      boardTagSwatch3Bg: "#e6f4d3",
      boardTagSwatch3Text: "#3d5b13",
      boardTagSwatch4Bg: "#d6efe4",
      boardTagSwatch4Text: "#0f5236",
      boardTagSwatch5Bg: "#d4edf7",
      boardTagSwatch5Text: "#0d4f6e",
      boardTagSwatch6Bg: "#dde1f5",
      boardTagSwatch6Text: "#28367a",
      boardTagSwatch7Bg: "#ecdcf5",
      boardTagSwatch7Text: "#5a1f7a",
      boardTagSwatch8Bg: "#f4d5e7",
      boardTagSwatch8Text: "#7a1c4f",
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
