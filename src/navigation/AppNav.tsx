import { Link } from "@tanstack/react-router";
import { Text } from "@tamagui/core";
import { XStack } from "@tamagui/stacks";

const links = [
  { to: "/boards", label: "Boards" },
  { to: "/", label: "Counter" },
  { to: "/tamagui-counter", label: "Tamagui counter" },
  { to: "/other-page", label: "Other page" },
  { to: "/auth", label: "Auth" },
] as const;

export function AppNav() {
  return (
    <XStack
      tag="nav"
      role="navigation"
      aria-label="Site"
      flexWrap="wrap"
      gap="$3"
      paddingHorizontal="$4"
      paddingVertical="$3"
      backgroundColor="$background"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      alignItems="center"
    >
      {links.map(({ to, label }) => (
        <Link key={to} to={to}>
          <Text
            cursor="pointer"
            fontSize="$3"
            fontWeight="500"
            color="$color11"
            textDecorationLine="underline"
            hoverStyle={{ color: "$color12" }}
          >
            {label}
          </Text>
        </Link>
      ))}
    </XStack>
  );
}
