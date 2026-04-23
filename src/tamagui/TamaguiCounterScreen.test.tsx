import assert from "node:assert/strict";
import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, it, vi } from "vitest";

import { counterPageCheckboxReducer } from "../store/counter-page-checkbox-slice";
import { TamaguiCounterScreen } from "./TamaguiCounterScreen";
import { TamaguiRootProvider } from "./TamaguiRootProvider";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("../trpc/client", () => ({
  trpc: {
    counter: {
      get: {
        useQuery: () => ({
          data: { value: 42 },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      increment: {
        useMutation: () => ({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

beforeEach(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

function renderWithProviders(ui: ReactElement) {
  const store = configureStore({
    reducer: { counterPageCheckbox: counterPageCheckboxReducer },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <TamaguiRootProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </Provider>
    </TamaguiRootProvider>,
  );
}

describe("TamaguiCounterScreen", () => {
  it("renders under TamaguiProvider with mocked tRPC data", async () => {
    renderWithProviders(<TamaguiCounterScreen />);

    assert.ok(await screen.findByText("42"));
    assert.ok(screen.getByText("Shared count"));
    assert.ok(screen.getByRole("button", { name: "Increment shared count" }));
    assert.ok(screen.getByRole("checkbox", { name: /Counter page option \(Redux\)/i }));
  });
});
