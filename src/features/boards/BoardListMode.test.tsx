import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";
import { BoardListMode } from "./BoardListMode";

describe("BoardListMode", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders card metadata and opens the selected card", () => {
    const onOpenCard = vi.fn();

    render(
      <TamaguiRootProvider>
        <BoardListMode
          listItems={[
            {
              id: "card-1",
              title: "Plan launch checklist",
              description: "",
              priority: "high",
              columnTitle: "To do",
              version: 0,
            },
          ]}
          isLoading={false}
          isLoadingMore={false}
          errorMessage={null}
          hasNextPage={false}
          onLoadMore={vi.fn()}
          onOpenCard={onOpenCard}
          onDeleteCard={vi.fn().mockResolvedValue(undefined)}
        />
      </TamaguiRootProvider>,
    );

    expect(screen.getByText("Plan launch checklist")).toBeTruthy();
    expect(screen.getByText("To do")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
    expect(screen.getByText("No description yet. Open the card to add more detail.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open card" }));

    expect(onOpenCard).toHaveBeenCalledWith("card-1");
  });

  it("keeps pagination and warning states available together", () => {
    const onLoadMore = vi.fn();

    render(
      <TamaguiRootProvider>
        <BoardListMode
          listItems={[
            {
              id: "card-2",
              title: "Follow up with design",
              description: "Waiting on updated mocks.",
              priority: "medium",
              columnTitle: "In progress",
              version: 0,
            },
          ]}
          isLoading={false}
          isLoadingMore={false}
          errorMessage="The latest refresh failed."
          hasNextPage
          onLoadMore={onLoadMore}
          onOpenCard={vi.fn()}
          onDeleteCard={vi.fn().mockResolvedValue(undefined)}
        />
      </TamaguiRootProvider>,
    );

    expect(screen.getByText("The latest refresh failed.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
