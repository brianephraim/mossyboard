import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLayoutEffect, type ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { TamaguiRootProvider } from "../tamagui/TamaguiRootProvider";
import { FormInlineTextField } from "./FormInlineTextField";

function InlineHarness({
  focusOnMouseUp = false,
  threshold,
  wrapInDragHandle = false,
}: Readonly<{
  focusOnMouseUp?: boolean;
  threshold?: number;
  wrapInDragHandle?: boolean;
}>) {
  const form = useForm<{ title: string }>({
    defaultValues: { title: "Hello" },
  });
  const field = (
    <FormInlineTextField<{ title: string }, "title">
      name="title"
      aria-label="Title"
      defaultValue="Hello"
      focusOnMouseUp={focusOnMouseUp}
      focusOnMouseUpDragThresholdPx={threshold}
    />
  );
  return (
    <TamaguiRootProvider>
      <FormProvider {...form}>
        {wrapInDragHandle ? (
          // Mimics the data attribute @hello-pangea/dnd applies to the drag
          // handle. The module-level guard scopes itself to editables that
          // live inside a `[data-rfd-drag-handle-draggable-id]` ancestor.
          <div data-rfd-drag-handle-draggable-id="harness-card">{field}</div>
        ) : (
          field
        )}
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

  it("stops mousedown at window capture phase only while focused inside a drag handle", () => {
    render(<InlineHarness focusOnMouseUp wrapInDragHandle />);
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

  it("does not stop mousedown when the focused input is outside a drag handle", () => {
    render(<InlineHarness focusOnMouseUp />);
    const field = screen.getByRole("textbox", { name: /title/i }) as HTMLInputElement;

    field.focus();
    expect(document.activeElement).toBe(field);

    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    const stopImmediate = vi.fn();
    Object.defineProperty(event, "stopImmediatePropagation", {
      value: stopImmediate,
      configurable: true,
    });
    field.dispatchEvent(event);

    expect(stopImmediate).not.toHaveBeenCalled();
  });
});

// Mimics the pattern @hello-pangea/dnd uses to install its keyboard sensor:
// a window-level capture-phase keydown listener registered via a layout
// effect. The default keyboard sensor is what swallows the user's Space
// keystroke and lifts the draggable; this stand-in lets us verify that the
// module-level guard short-circuits any such ancestor sensor before it can
// observe the event. The layout-effect registration is intentional —
// dnd's real sensor uses one too, and we want this stand-in to land in the
// listener queue *after* `dndInputSpaceGuard.ts`'s module-level listener so
// the test mirrors the production race we're guarding against.
function DndLikeKeyboardSensor({
  onSpace,
  children,
}: Readonly<{
  onSpace: (event: KeyboardEvent) => void;
  children: ReactNode;
}>) {
  useLayoutEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === " " || event.code === "Space" || event.keyCode === 32) {
        onSpace(event);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onSpace]);
  return <>{children}</>;
}

describe("FormInlineTextField space-key guard", () => {
  afterEach(() => {
    cleanup();
  });

  it("prevents an ancestor dnd-style keyboard sensor from observing Space while focused inside a drag handle", () => {
    const onSpace = vi.fn();

    render(
      <DndLikeKeyboardSensor onSpace={onSpace}>
        <InlineHarness wrapInDragHandle />
      </DndLikeKeyboardSensor>,
    );

    const field = screen.getByRole("textbox", { name: /title/i }) as HTMLInputElement;
    field.focus();
    expect(document.activeElement).toBe(field);

    const event = new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      keyCode: 32,
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(event);

    expect(onSpace).not.toHaveBeenCalled();
  });

  it("lets Space reach an ancestor sensor when the input is not focused", () => {
    const onSpace = vi.fn();

    render(
      <DndLikeKeyboardSensor onSpace={onSpace}>
        <InlineHarness wrapInDragHandle />
      </DndLikeKeyboardSensor>,
    );

    const event = new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      keyCode: 32,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);

    expect(onSpace).toHaveBeenCalledTimes(1);
  });

  it("lets Space reach an ancestor sensor when the focused input is outside a drag handle", () => {
    const onSpace = vi.fn();

    render(
      <DndLikeKeyboardSensor onSpace={onSpace}>
        <InlineHarness />
      </DndLikeKeyboardSensor>,
    );

    const field = screen.getByRole("textbox", { name: /title/i }) as HTMLInputElement;
    field.focus();
    expect(document.activeElement).toBe(field);

    const event = new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      keyCode: 32,
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(event);

    expect(onSpace).toHaveBeenCalledTimes(1);
  });
});
