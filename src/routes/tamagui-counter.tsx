import { createFileRoute } from "@tanstack/react-router";

import { TamaguiCounterScreen } from "../tamagui/TamaguiCounterScreen";

export const Route = createFileRoute("/tamagui-counter")({
  component: TamaguiCounterRoute,
});

function TamaguiCounterRoute() {
  return <TamaguiCounterScreen />;
}
