import { createFileRoute } from "@tanstack/react-router";

import { CounterView } from "../counter/CounterView";
import { trpc } from "../trpc/client";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const counterQuery = trpc.counter.get.useQuery({});
  const increment = trpc.counter.increment.useMutation({
    onSuccess: async () => {
      await counterQuery.refetch();
    },
  });

  return (
    <CounterView
      value={counterQuery.data?.value ?? null}
      isLoading={counterQuery.isLoading}
      isIncrementing={increment.isPending}
      error={counterQuery.error?.message ?? increment.error?.message ?? null}
      onIncrement={() => increment.mutate({})}
    />
  );
}
