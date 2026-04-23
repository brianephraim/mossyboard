import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

vi.mock("../mail/config", () => {
  return {
    getMailEnv: () => ({
      RESEND_API_KEY: "rk_test",
      RESEND_FROM_EMAIL: "from@example.com",
      APP_BASE_URL: "http://localhost:5173",
    }),
  };
});

vi.mock("../mail/delivery", () => {
  return {
    sendEmail: vi.fn(async () => ({ id: "email_123" })),
  };
});

vi.mock("./admin", () => {
  return {
    adminAuth: {
      generateEmailVerificationLink: vi.fn(async () => "https://verify/link"),
      generatePasswordResetLink: vi.fn(async () => "https://reset/link"),
    },
  };
});

describe("auth email service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends verification email with generated link", async () => {
    const { sendEmail } = await import("../mail/delivery");
    const { sendVerificationEmail } = await import("./email-service");

    const result = await sendVerificationEmail("a@example.com");
    assert.equal(result.deliveryId, "email_123");

    assert.equal((sendEmail as any).mock.calls.length, 1);
    const call = (sendEmail as any).mock.calls[0][0];
    assert.equal(call.to, "a@example.com");
    assert.equal(call.subject, "Verify your email");
    assert.ok(String(call.text).includes("https://verify/link"));
  });

  it("sends password reset email with generated link", async () => {
    const { sendEmail } = await import("../mail/delivery");
    const { sendPasswordResetEmail } = await import("./email-service");

    const result = await sendPasswordResetEmail("a@example.com");
    assert.equal(result.deliveryId, "email_123");

    assert.equal((sendEmail as any).mock.calls.length, 1);
    const call = (sendEmail as any).mock.calls[0][0];
    assert.equal(call.to, "a@example.com");
    assert.equal(call.subject, "Reset your password");
    assert.ok(String(call.text).includes("https://reset/link"));
  });
});
