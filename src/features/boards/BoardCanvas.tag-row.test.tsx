import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardTagsRow } from "./BoardCanvas/CardTagsRow";
import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";

const tagsFixture = [
  { id: "id-bug", name: "Bug", normalizedName: "bug" },
  { id: "id-fe", name: "Frontend", normalizedName: "frontend" },
  { id: "id-be", name: "Backend", normalizedName: "backend" },
];

function renderRow(overrides: Partial<ComponentProps<typeof CardTagsRow>> = {}) {
  const onAddTag = overrides.onAddTag ?? vi.fn().mockResolvedValue(undefined);
  const onDetachTag = overrides.onDetachTag ?? vi.fn().mockResolvedValue(undefined);

  const utils = render(
    <TamaguiRootProvider>
      <CardTagsRow
        attachedTags={[tagsFixture[0]!]}
        availableTags={tagsFixture}
        onAddTag={onAddTag}
        onDetachTag={onDetachTag}
        {...overrides}
      />
    </TamaguiRootProvider>,
  );

  return { ...utils, onAddTag, onDetachTag };
}

async function openPopover() {
  const addBtn = screen.getByLabelText("Add tag");
  fireEvent.click(addBtn);
  await screen.findByText("Tags");
}

describe("CardTagsRow", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders attached tags as pills with × buttons", () => {
    renderRow();
    expect(screen.getByText("Bug")).not.toBeNull();
    expect(screen.getByLabelText("Remove tag Bug")).not.toBeNull();
  });

  it("opens popover when + is pressed and lists existing tags", async () => {
    renderRow();
    await openPopover();
    expect(screen.getByText("Frontend")).not.toBeNull();
    expect(screen.getByText("Backend")).not.toBeNull();
  });

  it("disables already-attached tags in the popover list", async () => {
    renderRow();
    await openPopover();

    const buttons = screen.getAllByRole("button", { name: /Bug/ });
    const popoverBugButton = buttons.find(
      (button) => button.getAttribute("aria-label") !== "Remove tag Bug",
    );
    expect(popoverBugButton).toBeDefined();
    expect((popoverBugButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("filters list as user types", async () => {
    renderRow();
    await openPopover();

    const input = screen.getByPlaceholderText("Find or create…") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "front" } });

    expect(screen.getByText("Frontend")).not.toBeNull();
    expect(screen.queryByText("Backend")).toBeNull();
  });

  it("shows the no-match hint and Add still works to create", async () => {
    const { onAddTag } = renderRow();
    await openPopover();

    const input = screen.getByPlaceholderText("Find or create…") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "xyzzy" } });

    expect(screen.getByText(/Press Add to create "xyzzy"/)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onAddTag).toHaveBeenCalledWith("xyzzy");
  });

  it("Enter in input submits the trimmed name and clears", async () => {
    const { onAddTag } = renderRow();
    await openPopover();

    const input = screen.getByPlaceholderText("Find or create…") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  newtag  " } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await vi.waitFor(() => {
      expect(onAddTag).toHaveBeenCalledWith("newtag");
    });
  });

  it("clicking an existing (unattached) tag passes its current name to onAddTag", async () => {
    const { onAddTag } = renderRow();
    await openPopover();

    fireEvent.click(screen.getByRole("button", { name: /Frontend/ }));

    await vi.waitFor(() => {
      expect(onAddTag).toHaveBeenCalledWith("Frontend");
    });
  });

  it("× detaches the right tag", () => {
    const { onDetachTag } = renderRow();
    fireEvent.click(screen.getByLabelText("Remove tag Bug"));
    expect(onDetachTag).toHaveBeenCalledWith("id-bug");
  });

  it("× mousedown does not bubble to ancestor handlers (drag-handle protection)", () => {
    const ancestorMouseDown = vi.fn();
    render(
      <TamaguiRootProvider>
        <div onMouseDown={ancestorMouseDown}>
          <CardTagsRow
            attachedTags={[tagsFixture[0]!]}
            availableTags={tagsFixture}
            onAddTag={vi.fn()}
            onDetachTag={vi.fn()}
          />
        </div>
      </TamaguiRootProvider>,
    );

    const removeBtn = screen.getByLabelText("Remove tag Bug");
    fireEvent.mouseDown(removeBtn);

    expect(ancestorMouseDown).not.toHaveBeenCalled();
  });
});
