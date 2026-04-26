import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";
import { EditableBoardTitle } from "./EditableBoardTitle";

// Why `field.focus()` and not `fireEvent.focus(field)`:
//   In jsdom, `fireEvent.focus` only dispatches the focus event — it does NOT move
//   `document.activeElement`. Calling the native `.focus()` method does both, which
//   matches the user-perceived behavior we want to assert.
// Why `expect(...).toBe(...)` and not `assert.equal(..., DOMNode)`:
//   `node:assert/strict` will pretty-print BOTH operands when an equality check fails.
//   On a heavy Tamagui-rendered tree, that DOM walk explodes (circular refs + huge
//   computed-class lists) and OOMs the worker. Vitest's `expect` has DOM-aware
//   serialization that truncates safely.

describe("EditableBoardTitle", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens an inline field and saves a trimmed title on blur", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <TamaguiRootProvider>
        <EditableBoardTitle title="Roadmap" onSave={onSave} />
      </TamaguiRootProvider>,
    );

    const field = screen.getByRole("textbox", { name: /board title/i });
    field.focus();
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: "  Renamed roadmap  " } });
    fireEvent.blur(field);

    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("Renamed roadmap");
    });
  });

  it("restores the current title instead of saving blank input", () => {
    const onSave = vi.fn();

    render(
      <TamaguiRootProvider>
        <EditableBoardTitle title="Roadmap" onSave={onSave} />
      </TamaguiRootProvider>,
    );

    const field = screen.getByRole("textbox", { name: /board title/i });
    field.focus();
    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.blur(field);

    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels the edit on Escape", () => {
    const onSave = vi.fn();

    render(
      <TamaguiRootProvider>
        <EditableBoardTitle title="Roadmap" onSave={onSave} />
      </TamaguiRootProvider>,
    );

    const field = screen.getByRole("textbox", { name: /board title/i });
    field.focus();
    fireEvent.change(field, { target: { value: "Discarded" } });
    fireEvent.keyDown(field, { key: "Escape" });

    expect(onSave).not.toHaveBeenCalled();
  });
});
