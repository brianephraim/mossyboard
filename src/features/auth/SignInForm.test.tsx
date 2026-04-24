import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignInForm } from "./SignInForm";
import { AuthAnnounceProvider } from "./AuthAnnounceContext";
import { TamaguiRootProvider } from "../../tamagui/TamaguiRootProvider";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

describe("SignInForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows validation errors for empty submit", async () => {
    const headingRef = { current: null as HTMLElement | null };

    render(
      <TamaguiRootProvider>
        <AuthAnnounceProvider>
          <SignInForm redirectTo="/boards" formHeadingRef={headingRef} />
        </AuthAnnounceProvider>
      </TamaguiRootProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/enter your email/i)).toBeTruthy();
    expect(screen.getByText(/enter your password/i)).toBeTruthy();
  });
});
