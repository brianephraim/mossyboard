import assert from "node:assert/strict";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BoardRouteGate } from "./access";
import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  pathname: "/boards",
  /** Matches `useRouterState` select shape in `BoardRouteGate` (`search` = query string). */
  search: "?status=active",
}));

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");

  return {
    ...actual,
    useNavigate: () => routerMocks.navigate,
    useRouterState: () => ({
      pathname: routerMocks.pathname,
      search: routerMocks.search,
    }),
  };
});

const useAuthSessionMock = vi.fn();
const useRequiresEmailVerificationMock = vi.fn();

vi.mock("../../auth/session", () => ({
  useAuthSession: () => useAuthSessionMock(),
  useRequiresEmailVerification: () => useRequiresEmailVerificationMock(),
}));

function renderGate(children: React.ReactNode) {
  return render(<TamaguiRootProvider>{children}</TamaguiRootProvider>);
}

describe("BoardRouteGate", () => {
  beforeEach(() => {
    routerMocks.pathname = "/boards";
    routerMocks.search = "?status=active";
  });

  afterEach(() => {
    cleanup();
    routerMocks.navigate.mockReset();
  });

  it("redirects unauthenticated users to /auth with sign-in mode and redirectTo", async () => {
    useAuthSessionMock.mockReturnValue({
      hasResolvedInitialAuth: true,
      isSignedIn: false,
      user: null,
    });
    useRequiresEmailVerificationMock.mockReturnValue(false);

    renderGate(
      <BoardRouteGate>
        <div data-testid="child">inside</div>
      </BoardRouteGate>,
    );

    await vi.waitFor(() => {
      expect(routerMocks.navigate).toHaveBeenCalled();
    });

    const call = routerMocks.navigate.mock.calls.at(0)?.[0] as {
      to: string;
      search: { mode?: string; redirectTo?: string };
    };
    assert.ok(call);
    assert.equal(call.to, "/auth");
    assert.equal(call.search.mode, "signin");
    assert.ok(String(call.search.redirectTo ?? "").startsWith("/boards"));
  });

  it("routes unverified users to /verify-email when verification is required", async () => {
    useAuthSessionMock.mockReturnValue({
      hasResolvedInitialAuth: true,
      isSignedIn: true,
      user: { emailVerified: false, email: "a@b.com" },
    });
    useRequiresEmailVerificationMock.mockReturnValue(true);

    renderGate(
      <BoardRouteGate>
        <div data-testid="child">inside</div>
      </BoardRouteGate>,
    );

    await vi.waitFor(() => {
      expect(routerMocks.navigate).toHaveBeenCalled();
    });

    const call = routerMocks.navigate.mock.calls.at(0)?.[0] as {
      to: string;
      search: { redirectTo?: string };
    };
    assert.equal(call.to, "/verify-email");
    assert.ok(String(call.search.redirectTo ?? "").startsWith("/boards"));
  });

  it("preserves deep board links in redirectTo for unauthenticated users", async () => {
    routerMocks.pathname = "/boards/deep-board-id";
    routerMocks.search = "?view=list";

    useAuthSessionMock.mockReturnValue({
      hasResolvedInitialAuth: true,
      isSignedIn: false,
      user: null,
    });
    useRequiresEmailVerificationMock.mockReturnValue(false);

    renderGate(
      <BoardRouteGate>
        <div data-testid="child">inside</div>
      </BoardRouteGate>,
    );

    await vi.waitFor(() => {
      expect(routerMocks.navigate).toHaveBeenCalled();
    });

    const call = routerMocks.navigate.mock.calls.at(0)?.[0] as {
      to: string;
      search: { redirectTo?: string };
    };
    assert.ok(call);
    assert.equal(call.to, "/auth");
    assert.equal(call.search.redirectTo, "/boards/deep-board-id?view=list");
  });

  it("renders protected content for unverified users when verification is not required", () => {
    useAuthSessionMock.mockReturnValue({
      hasResolvedInitialAuth: true,
      isSignedIn: true,
      user: { emailVerified: false, email: "a@b.com" },
    });
    useRequiresEmailVerificationMock.mockReturnValue(false);

    renderGate(
      <BoardRouteGate>
        <div data-testid="child">inside</div>
      </BoardRouteGate>,
    );

    expect(screen.getByTestId("child")).toBeTruthy();
    expect(routerMocks.navigate).not.toHaveBeenCalled();
  });

  it("renders children when signed in and verification satisfied", () => {
    useAuthSessionMock.mockReturnValue({
      hasResolvedInitialAuth: true,
      isSignedIn: true,
      user: { emailVerified: true, email: "a@b.com" },
    });
    useRequiresEmailVerificationMock.mockReturnValue(false);

    renderGate(
      <BoardRouteGate>
        <div data-testid="child">inside</div>
      </BoardRouteGate>,
    );

    expect(screen.getByTestId("child")).toBeTruthy();
  });
});
