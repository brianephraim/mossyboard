import { createFileRoute, Link } from "@tanstack/react-router";

import { CounterView } from "../counter/CounterView";
import {
  selectCounterPageCheckboxChecked,
  toggleChecked,
} from "../store/counter-page-checkbox-slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { trpc } from "../trpc/client";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const dispatch = useAppDispatch();
  const checkboxChecked = useAppSelector(selectCounterPageCheckboxChecked);

  const counterQuery = trpc.counter.get.useQuery({});
  const increment = trpc.counter.increment.useMutation({
    onSuccess: async () => {
      await counterQuery.refetch();
    },
  });

  return (
    <main>
      <CounterView
        value={counterQuery.data?.value ?? null}
        isLoading={counterQuery.isLoading}
        isIncrementing={increment.isPending}
        error={counterQuery.error?.message ?? increment.error?.message ?? null}
        onIncrement={() => increment.mutate({})}
      />
      <section aria-label="Counter page options">
        <label htmlFor="counter-page-option">
          <input
            id="counter-page-option"
            type="checkbox"
            checked={checkboxChecked}
            onChange={() => dispatch(toggleChecked())}
          />{" "}
          Counter page option (Redux)
        </label>
        <div>
          <Link to="/other-page">Other page</Link>
        </div>
      </section>
    </main>
  );
}
