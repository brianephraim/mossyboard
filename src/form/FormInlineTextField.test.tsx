import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

import { TamaguiRootProvider } from "../tamagui/TamaguiRootProvider";
import { FormInlineTextField } from "./FormInlineTextField";

function InlineHarness({
  focusOnMouseUp = false,
  threshold,
}: Readonly<{
  focusOnMouseUp?: boolean;
  threshold?: number;
}>) {
  const form = useForm<{ title: string }>({
    defaultValues: { title: "Hello" },
  });
  return (
    <TamaguiRootProvider>
      <FormProvider {...form}>
        <FormInlineTextField<{ title: string }, "title">
          name="title"
          aria-label="Title"
          defaultValue="Hello"
          focusOnMouseUp={focusOnMouseUp}
          focusOnMouseUpDragThresholdPx={threshold}
        />
      </FormProvider>
    </TamaguiRootProvider>
  );
}

describe("FormInlineTextField focusOnMouseUp", () => {
  afterEach(() => {
    cleanup();
  });

  it("focuses on mouseup when the press did not move past the threshold", () => {
    render(<InlineHarness focusOnMouseUp />);
    const field = screen.getByRole("textbox", { name: /title/i }) as HTMLInputElement;

    expect(document.activeElement).not.toBe(field);
    // Native mousedown on an input would normally focus it. Tests run in
    // jsdom which already gives focus on mousedown via fireEvent, so we
    // explicitly blur after dispatching mousedown to simulate dnd's
    // preventDefault behavior, then assert mouseup is the thing that
    // restores focus when no drag occurred.
    fireEvent.mouseDown(field, { clientX: 100, clientY: 100 });
    field.blur();
    expect(document.activeElement).not.toBe(field);

    fireEvent.mouseUp(window, { clientX: 100, clientY: 100 });
    expect(document.activeElement).toBe(field);
  });

  it("does not focus on mouseup when movement exceeded the drag threshold", () => {
    render(<InlineHarness focusOnMouseUp threshold={5} />);
    const field = screen.getByRole("textbox", { name: /title/i }) as HTMLInputElement;

    fireEvent.mouseDown(field, { clientX: 100, clientY: 100 });
    field.blur();
    fireEvent.mouseMove(window, { clientX: 150, clientY: 100 });
    fireEvent.mouseUp(window, { clientX: 150, clientY: 100 });
    expect(document.activeElement).not.toBe(field);
  });

  it("focuses normally when focusOnMouseUp is not enabled", () => {
    render(<InlineHarness />);
    const field = screen.getByRole("textbox", { name: /title/i }) as HTMLInputElement;

    field.focus();
    expect(document.activeElement).toBe(field);
  });

  it("stops mousedown at window capture phase only while focused", () => {
    render(<InlineHarness focusOnMouseUp />);
    const field = screen.getByRole("textbox", { name: /title/i }) as HTMLInputElement;

    const dispatch = (target: HTMLElement) => {
      const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      const stopImmediate = vi.fn();
      Object.defineProperty(event, "stopImmediatePropagation", {
        value: stopImmediate,
        configurable: true,
      });
      target.dispatchEvent(event);
      return stopImmediate;
    };

    expect(document.activeElement).not.toBe(field);
    const stopWhenUnfocused = dispatch(field);
    expect(stopWhenUnfocused).not.toHaveBeenCalled();

    field.focus();
    expect(document.activeElement).toBe(field);
    const stopWhenFocused = dispatch(field);
    expect(stopWhenFocused).toHaveBeenCalled();
  });
});
