import { useNavigate } from "@tanstack/react-router";
import { Text } from "@tamagui/core";
import { Tabs } from "@tamagui/tabs";

type AuthModeTabsValue = "signin" | "signup";

type AuthModeTabsProps = Readonly<{
  activeMode: AuthModeTabsValue;
  redirectTo: string;
}>;

export function AuthModeTabs({ activeMode, redirectTo }: AuthModeTabsProps) {
  const navigate = useNavigate();

  return (
    <Tabs
      value={activeMode}
      onValueChange={(next) => {
        if (next !== "signin" && next !== "signup") {
          return;
        }
        if (next === activeMode) {
          return;
        }

        void navigate({
          to: "/auth",
          search: { mode: next, redirectTo, reason: undefined },
          replace: true,
        });
      }}
      orientation="horizontal"
      activationMode="manual"
      width="100%"
    >
      <Tabs.List
        loop={false}
        gap="$1"
        backgroundColor="$boardAccentWash"
        borderWidth={1}
        borderColor="$boardShellBorder"
        borderRadius="$boardPill"
        padding="$1"
      >
        <Tabs.Tab
          value="signup"
          flex={1}
          borderRadius="$boardPill"
          borderWidth={1}
          borderColor={activeMode === "signup" ? "$boardShellBorder" : "transparent"}
          backgroundColor={activeMode === "signup" ? "$boardPanelSurfaceStrong" : "transparent"}
          hoverStyle={{ backgroundColor: "$boardPanelSurfaceStrong" }}
        >
          <Text
            fontWeight="700"
            color={activeMode === "signup" ? "$boardHeading" : "$boardTextMuted"}
          >
            Create account
          </Text>
        </Tabs.Tab>
        <Tabs.Tab
          value="signin"
          flex={1}
          borderRadius="$boardPill"
          borderWidth={1}
          borderColor={activeMode === "signin" ? "$boardShellBorder" : "transparent"}
          backgroundColor={activeMode === "signin" ? "$boardPanelSurfaceStrong" : "transparent"}
          hoverStyle={{ backgroundColor: "$boardPanelSurfaceStrong" }}
        >
          <Text
            fontWeight="700"
            color={activeMode === "signin" ? "$boardHeading" : "$boardTextMuted"}
          >
            Sign in
          </Text>
        </Tabs.Tab>
      </Tabs.List>
      {/* Tabs.Content panels are required by the API; the actual form is rendered
          outside the tabs so it can sit inside the surrounding board surface. */}
      <Tabs.Content value="signup" height={0} overflow="hidden" opacity={0} aria-hidden>
        <Text height={0}> </Text>
      </Tabs.Content>
      <Tabs.Content value="signin" height={0} overflow="hidden" opacity={0} aria-hidden>
        <Text height={0}> </Text>
      </Tabs.Content>
    </Tabs>
  );
}
