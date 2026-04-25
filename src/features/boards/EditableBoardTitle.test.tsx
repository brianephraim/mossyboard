import assert from "node:assert/strict";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";
import { EditableBoardTitle } from "./EditableBoardTitle";

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
    fireEvent.focus(field);
    assert.equal(document.activeElement, field);
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
    fireEvent.focus(field);
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
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "Discarded" } });
    fireEvent.keyDown(field, { key: "Escape" });

    expect(onSave).not.toHaveBeenCalled();
  });
});
