import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";
import { BoardControlsPanel } from "./BoardControlsPanel";
import { BoardMobileMenuContent } from "./BoardMobileMenuContent";
import { BoardActionButton } from "./ui";

vi.mock("@tanstack/react-router", () => ({
  useLinkProps: () => ({ href: "#" }),
}));

vi.mock("../auth/AccountSignOutControl", () => ({
  AccountSignOutControl: ({
    onSignedOut,
  }: Readonly<{
    onSignedOut?: () => void;
  }>) => <button onClick={onSignedOut}>Sign out</button>,
}));

vi.mock("../auth/VerificationSidebarCallout", () => ({
  VerificationSidebarCallout: ({
    userEmail,
  }: Readonly<{
    userEmail: string | null | undefined;
  }>) => <>{`Verification pending for ${userEmail}. Check your inbox to verify.`}</>,
}));

describe("BoardMobileMenuContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("stacks current-board controls, boards, account details, and sign out in order", () => {
    const onCreateBoard = vi.fn();
    const onSignedOut = vi.fn();

    render(
      <TamaguiRootProvider>
        <BoardMobileMenuContent
          headerActions={<BoardActionButton tone="ghost">Add sample data</BoardActionButton>}
          boardControls={
            <BoardControlsPanel
              variant="menu"
              search={{
                view: "board",
                groupBy: "column",
                priority: ["high"],
                tags: [],
              }}
              onSetView={vi.fn()}
              onSetGroupBy={vi.fn()}
              onTogglePriority={vi.fn()}
              onClearPriority={vi.fn()}
            />
          }
          boards={[
            {
              id: "board-1",
              name: "Launch board",
              columnCount: 3,
              cardCount: 8,
            },
          ]}
          currentBoardId="board-1"
          isLoadingBoards={false}
          isBoardListError={false}
          onRetryBoards={vi.fn()}
          onCreateBoard={onCreateBoard}
          userEmail="moss@example.com"
          emailVerified={false}
          showVerificationCallout
          onSignedOut={onSignedOut}
        />
      </TamaguiRootProvider>,
    );

    expect(screen.getByText("Current board")).toBeTruthy();
    expect(screen.getByText("Board actions")).toBeTruthy();
    expect(screen.getByText("View")).toBeTruthy();
    expect(screen.getByText("Group by")).toBeTruthy();
    expect(screen.getByText("Priority filter")).toBeTruthy();
    expect(screen.getByText("Launch board")).toBeTruthy();
    expect(
      screen.getByText("Verification pending for moss@example.com. Check your inbox to verify."),
    ).toBeTruthy();

    const currentBoard = screen.getByText("Current board");
    const newBoard = screen.getByRole("button", { name: /\+ new board/i });
    const boardsHeading = screen.getByText("Boards");
    const accountEmail = screen.getByText("moss@example.com");
    const signOut = screen.getByRole("button", { name: "Sign out" });

    expect(
      Boolean(currentBoard.compareDocumentPosition(newBoard) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
    expect(
      Boolean(newBoard.compareDocumentPosition(boardsHeading) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
    expect(
      Boolean(
        boardsHeading.compareDocumentPosition(accountEmail) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(
      Boolean(accountEmail.compareDocumentPosition(signOut) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);

    fireEvent.click(newBoard);
    fireEvent.click(signOut);

    expect(onCreateBoard).toHaveBeenCalledTimes(1);
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });
});
