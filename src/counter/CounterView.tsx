import type { ReactNode } from "react";

export function CounterView({
  value,
  isLoading,
  isIncrementing,
  error,
  onIncrement,
}: Readonly<{
  value: number | null;
  isLoading: boolean;
  isIncrementing: boolean;
  error: ReactNode | null;
  onIncrement: () => void;
}>) {
  if (isLoading) return <main>Loading…</main>;

  if (error) return <main>Error: {error}</main>;

  return (
    <main>
      <div>Shared count: {value ?? "?"}</div>
      <button type="button" onClick={onIncrement} disabled={isIncrementing}>
        {isIncrementing ? "Incrementing…" : "Increment"}
      </button>
    </main>
  );
}
