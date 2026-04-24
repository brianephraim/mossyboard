import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BoardsIndexScreen } from "./BoardsIndexScreen";
import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children?: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

const listUseQuery = vi.fn();

vi.mock("../../trpc/client", () => ({
  trpc: {
    board: {
      list: {
        useQuery: () => listUseQuery(),
      },
      create: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
    authEmail: {
      sendVerification: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      board: {
        list: {
          invalidate: vi.fn(),
        },
      },
    }),
  },
}));

describe("BoardsIndexScreen", () => {
  beforeEach(() => {
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
  });

  afterEach(() => {
    cleanup();
    listUseQuery.mockReset();
  });

  it("shows loading state on first fetch", () => {
    listUseQuery.mockReturnValue({
      isLoading: true,
      data: undefined,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <TamaguiRootProvider>
        <BoardsIndexScreen />
      </TamaguiRootProvider>,
    );

    expect(screen.getByRole("heading", { name: /loading boards/i })).toBeTruthy();
  });

  it("shows error state when list fails with no cached data", () => {
    listUseQuery.mockReturnValue({
      isLoading: false,
      data: undefined,
      isError: true,
      refetch: vi.fn(),
    });

    render(
      <TamaguiRootProvider>
        <BoardsIndexScreen />
      </TamaguiRootProvider>,
    );

    expect(screen.getByText(/couldn’t load your boards/i)).toBeTruthy();
  });

  it("shows empty state when there are no boards", () => {
    listUseQuery.mockReturnValue({
      isLoading: false,
      data: { boards: [] },
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <TamaguiRootProvider>
        <BoardsIndexScreen />
      </TamaguiRootProvider>,
    );

    expect(screen.getByText(/Start your first board/i)).toBeTruthy();
  });
});
