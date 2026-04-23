import assert from "node:assert/strict";
import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";

import { CounterView } from "./CounterView";

describe("CounterView", () => {
  it("renders the current count", () => {
    const onIncrement = vi.fn();
    const r = render(
      <CounterView
        value={5}
        isLoading={false}
        isIncrementing={false}
        error={null}
        onIncrement={onIncrement}
      />,
    );
    assert.ok(r.getByText("Shared count: 5"));
    assert.ok(r.getByRole("button", { name: "Increment" }));
  });

  it("increments on click", async () => {
    const onIncrement = vi.fn();
    const r = render(
      <CounterView
        value={0}
        isLoading={false}
        isIncrementing={false}
        error={null}
        onIncrement={onIncrement}
      />,
    );
    r.getByRole("button", { name: "Increment" }).click();
    assert.equal(onIncrement.mock.calls.length, 1);
  });
});
