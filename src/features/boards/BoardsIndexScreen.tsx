import { useState } from "react";

import { BoardShell } from "./BoardShell";
import type { BoardsIndexStatus } from "./types";
import { BoardActionButton, BoardInlineNotice, BoardStateCard } from "./ui";
import { trpc } from "../../trpc/client";

export function BoardsIndexScreen({
  status,
}: Readonly<{
  status?: BoardsIndexStatus;
}>) {
  const boardsQuery = trpc.board.list.useQuery({});
  const [announcement] = useState<string | null>(status === "deleted" ? "Board deleted." : null);

  return (
    <BoardShell
      title="Your boards"
      subtitle="Pick a board, create a new one, or return to a recent workspace from the rail."
      announcement={announcement}
      renderContent={({ openCreateBoard }) => {
        if (boardsQuery.isLoading && !boardsQuery.data) {
          return (
            <BoardStateCard
              title="Loading boards"
              description="We’re gathering your boards and recent activity now."
            />
          );
        }

        if (boardsQuery.isError && !boardsQuery.data) {
          return (
            <BoardStateCard
              title="We couldn’t load your boards"
              description="The workspace entry screen needs the protected board list. Retry the request and we’ll try again."
              actions={
                <BoardActionButton onPress={() => void boardsQuery.refetch()}>
                  Retry
                </BoardActionButton>
              }
            />
          );
        }

        const boards = boardsQuery.data?.boards ?? [];

        if (boards.length === 0) {
          return (
            <BoardStateCard
              title="Start your first board"
              description="Create a board to get the default To do, In progress, and Done structure seeded for you."
              actions={
                <BoardActionButton tone="accent" onPress={openCreateBoard}>
                  Create board
                </BoardActionButton>
              }
            />
          );
        }

        return (
          <>
            {status === "deleted" ? (
              <BoardInlineNotice
                tone="success"
                message="Board deleted. You’re back on your board index."
              />
            ) : null}
            <BoardStateCard
              title="Choose a board from the rail"
              description="Your boards are ready in the sidebar. Select one to enter the board canvas, detail panel, filters, and reorder flows."
              actions={
                <BoardActionButton tone="accent" onPress={openCreateBoard}>
                  Create another board
                </BoardActionButton>
              }
            />
          </>
        );
      }}
    />
  );
}
