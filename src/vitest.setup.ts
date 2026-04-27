import "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Sql } from "postgres";
import { Fragment, createElement } from "react";

// Stub `react-virtuoso` for jsdom: render all items synchronously and call the
// rendered Footer (used by `@hello-pangea/dnd`'s `Droppable` placeholder) so
// drag-and-drop assertions still find the placeholder. We forward `scrollerRef`
// to a real `div` so `@hello-pangea/dnd` is satisfied that its inner ref
// resolves to an HTMLElement. Real virtualization is only meaningful in a
// browser; tests bypass it.
vi.mock("react-virtuoso", () => {
  type ItemContent = (index: number, item: unknown) => React.ReactNode;
  type Components = { Footer?: React.FC };
  type ScrollerRef = ((ref: HTMLElement | null) => void) | { current: HTMLElement | null };
  type VirtuosoProps = {
    data?: unknown[];
    totalCount?: number;
    itemContent?: ItemContent;
    components?: Components;
    scrollerRef?: ScrollerRef;
    style?: React.CSSProperties;
  };
  const Virtuoso = (props: VirtuosoProps) => {
    const items = props.data ?? [];
    const renderedItems = items.map((item, index) =>
      createElement(
        Fragment,
        { key: index },
        props.itemContent ? props.itemContent(index, item) : null,
      ),
    );
    const Footer = props.components?.Footer;
    return createElement(
      "div",
      {
        ref: (node: HTMLDivElement | null) => {
          if (typeof props.scrollerRef === "function") {
            props.scrollerRef(node);
          } else if (props.scrollerRef && typeof props.scrollerRef === "object") {
            props.scrollerRef.current = node;
          }
        },
        style: props.style,
      },
      ...renderedItems,
      Footer ? createElement(Footer) : null,
    );
  };
  return { Virtuoso };
});

// In Vitest's jsdom environment on Node 24, `Request.signal` can come from a different
// realm than `globalThis.AbortSignal` (Node/undici vs jsdom). tRPC uses `AbortSignal.any`
// to combine signals; jsdom's implementation asserts all inputs are jsdom AbortSignals
// and throws, producing HTTP 500s in fetchRequestHandler tests.
//
// We patch in a realm-agnostic `AbortSignal.any` that accepts any signal-like object.
if (typeof AbortSignal !== "undefined") {
  const any = (AbortSignal as unknown as { any?: (signals: unknown[]) => AbortSignal }).any;
  (AbortSignal as unknown as { any: (signals: unknown[]) => AbortSignal }).any = (signals) => {
    try {
      if (any) return any(signals);
    } catch {
      // fall through to ponyfill
    }

    const controller = new AbortController();
    for (const signal of signals) {
      if (!signal || typeof signal !== "object") continue;
      const s = signal as {
        aborted?: boolean;
        reason?: unknown;
        addEventListener?: (
          type: "abort",
          listener: () => void,
          options?: { once?: boolean },
        ) => void;
      };
      if (s.aborted) {
        controller.abort(s.reason);
        break;
      }
      s.addEventListener?.("abort", () => controller.abort(s.reason), { once: true });
    }
    return controller.signal;
  };
}

// TanStack Router scroll restoration touches window.scrollTo, which jsdom doesn't implement.
// We stub it for tests that mount the router.
Object.defineProperty(window, "scrollTo", {
  value: () => {},
  writable: true,
});

afterEach(() => {
  cleanup();
});

afterAll(async () => {
  // `postgres()` keeps sockets open; close them so Vitest can exit cleanly.
  const holder = globalThis as unknown as { __sql__?: Sql };
  const sql = holder.__sql__;
  await sql?.end({ timeout: 5 });
  // setupFiles runs per test file; module state can persist across files in the same worker.
  // If we close the connection, also clear it so subsequent files can recreate a fresh client.
  delete holder.__sql__;
});

// Load `.env` for local test runs (gitignored).
// We only fill missing keys to avoid clobbering the runner's env.
try {
  const envPath = resolve(process.cwd(), ".env");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
} catch {
  // ignore missing .env in CI
}
