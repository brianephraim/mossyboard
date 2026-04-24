import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { parseAuthMode, parseSafeRedirectTo, parseSessionExpiredReason } from "./searchParams";

describe("parseSafeRedirectTo", () => {
  it("accepts same-origin paths", () => {
    assert.equal(parseSafeRedirectTo("/boards/b1", undefined), "/boards/b1");
  });

  it("rejects protocol-relative and external-looking paths", () => {
    assert.equal(parseSafeRedirectTo("//evil.com", undefined), "/boards");
    assert.equal(parseSafeRedirectTo("https://evil.com", undefined), "/boards");
  });

  it("rejects auth self-loop targets", () => {
    assert.equal(parseSafeRedirectTo("/auth?mode=signin", undefined), "/boards");
  });

  it("accepts legacy redirect param", () => {
    assert.equal(parseSafeRedirectTo(undefined, "/boards/x"), "/boards/x");
  });
});

describe("parseAuthMode", () => {
  it("defaults invalid modes to signin", () => {
    assert.equal(parseAuthMode("nope"), "signin");
    assert.equal(parseAuthMode(undefined), "signin");
  });

  it("accepts known modes", () => {
    assert.equal(parseAuthMode("reset"), "reset");
  });
});

describe("parseSessionExpiredReason", () => {
  it("detects session-expired reason", () => {
    assert.equal(parseSessionExpiredReason("session-expired"), true);
    assert.equal(parseSessionExpiredReason("other"), false);
  });
});
