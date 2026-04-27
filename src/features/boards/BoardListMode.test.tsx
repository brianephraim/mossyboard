import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";
import { BoardListMode } from "./BoardListMode";

describe("BoardListMode", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders card metadata for the selected card", () => {
    render(
      <TamaguiRootProvider>
        <BoardListMode
          listItems={[
            {
              id: "card-1",
              columnId: "00000000-0000-0000-0000-000000000001",
              title: "Plan launch checklist",
              description: "",
              priority: "high",
              columnTitle: "To do",
              position: "a0",
              version: 0,
              updatedAt: "2026-04-27T03:20:00.000Z",
              tags: [],
            },
          ]}
          isLoading={false}
          isLoadingMore={false}
          errorMessage={null}
          hasNextPage={false}
          onLoadMore={vi.fn()}
          availableTags={[]}
          onDeleteCard={vi.fn().mockResolvedValue(undefined)}
          onAddTag={vi.fn().mockResolvedValue(undefined)}
          onDetachTag={vi.fn().mockResolvedValue(undefined)}
          onRenameCardTitle={vi.fn().mockResolvedValue(undefined)}
        />
      </TamaguiRootProvider>,
    );

    expect(screen.getByDisplayValue("Plan launch checklist")).toBeTruthy();
    expect(screen.getByText("To do")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit priority" })).toBeTruthy();
    expect(screen.getByLabelText("Card description")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
  });

  it("keeps pagination and warning states available together", () => {
    const onLoadMore = vi.fn();

    render(
      <TamaguiRootProvider>
        <BoardListMode
          listItems={[
            {
              id: "card-2",
              columnId: "00000000-0000-0000-0000-000000000002",
              title: "Follow up with design",
              description: "Waiting on updated mocks.",
              priority: "medium",
              columnTitle: "In progress",
              position: "a0",
              version: 0,
              updatedAt: "2026-04-27T03:20:00.000Z",
              tags: [],
            },
          ]}
          isLoading={false}
          isLoadingMore={false}
          errorMessage="The latest refresh failed."
          hasNextPage
          onLoadMore={onLoadMore}
          availableTags={[]}
          onDeleteCard={vi.fn().mockResolvedValue(undefined)}
          onAddTag={vi.fn().mockResolvedValue(undefined)}
          onDetachTag={vi.fn().mockResolvedValue(undefined)}
          onRenameCardTitle={vi.fn().mockResolvedValue(undefined)}
        />
      </TamaguiRootProvider>,
    );

    expect(screen.getByText("The latest refresh failed.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
