import assert from "node:assert/strict";
import { render } from "@testing-library/react";
import { describe, it } from "vitest";

import { App } from "./app";

describe("smoke", () => {
  it("runs", () => {
    assert.equal(1 + 1, 2);
  });

  it("renders the root route", async () => {
    const result = render(<App />);
    assert.ok(await result.findByText("Kanban"));
  });
});
