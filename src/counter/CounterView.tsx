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
  if (isLoading) return <div>Loading…</div>;

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div>Shared count: {value ?? "?"}</div>
      <button type="button" onClick={onIncrement} disabled={isIncrementing}>
        {isIncrementing ? "Incrementing…" : "Increment"}
      </button>
    </div>
  );
}
