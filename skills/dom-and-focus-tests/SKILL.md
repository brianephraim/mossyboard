---
name: dom-and-focus-tests
description: Write tests that interact with focus, DOM nodes, refs, or document.activeElement without falling into the node:assert/strict + DOM serializer OOM trap. Use when a request adds, debugs, or reviews any test that asserts on focus, an element, a ref, or an event target — or any time a vitest run is hanging or OOMing.
---

# DOM and Focus Tests

This repo uses Vitest + jsdom + `@testing-library/react` + `node:assert/strict`. That combination has two recurring traps that, when combined, can hang a Vitest worker and OOM the host (multi-GB RSS in seconds, no error output until the OS kills the process).

## The two rules

### 1. Never pass a DOM node to `node:assert/strict`

When `assert.equal(a, b)` (or `assert.deepEqual`) fails, Node pretty-prints **both operands** so it can show a diff. Pretty-printing walks every property and child of an object. DOM nodes have circular `parentNode`/`childNodes` references and — once a Tamagui tree is rendered — dozens of generated class names, theme nodes, and computed style attributes per element. The serializer doesn't truncate, so it tries to expand the whole tree, allocates gigabytes of strings, and the worker dies silently.

**Symptom signature:** test starts, no assertion error appears, no test "FAIL" line, RSS climbs past 1 GB, worker hangs forever (or the host OOMs). If you see this with a test that asserts something about DOM, this is your bug.

**Rule:** Never pass these to `node:assert/strict`'s `equal` / `deepEqual` / `notEqual` / `notDeepEqual`:

- A DOM node (`HTMLElement`, `Node`, `EventTarget`)
- `document.activeElement`
- An RTL query result (`screen.getByRole(...)`, `getByLabelText(...)`, etc.)
- A React ref's `.current`
- An object that may contain any of the above (event objects, fixture state, snapshot objects)

**Fix:** Use Vitest's `expect`, which has DOM-aware truncation:

- `expect(node).toBe(other)` — strict reference equality, prints a bounded HTML snippet on failure.
- `expect(node).toEqual(...)` — same, with structural equality.
- `expect(node).toHaveAttribute(...)`, `.toHaveTextContent(...)`, `.toBeVisible()` — when `@testing-library/jest-dom` matchers are available.

For non-DOM values, `node:assert/strict` is fine and remains the default.

### 2. `fireEvent.focus(element)` does NOT move `document.activeElement`

In jsdom, `fireEvent.focus` only **dispatches** the focus event. It does not actually move the document's focused element. So this will always fail:

```ts
fireEvent.focus(field);
expect(document.activeElement).toBe(field); // FAILS — activeElement is still <body>
```

**Fix:** Call the native `.focus()` method, which both fires the event AND moves focus:

```ts
field.focus();
expect(document.activeElement).toBe(field); // passes
```

`field.focus()` triggers the component's `onFocus` handler the same way `fireEvent.focus` does, so any reactive logic still runs. Use `fireEvent.focus` only when you specifically want to fire the event without moving the document's focus (rare).

For richer interaction simulation (real keyboard tab order, click-then-type sequences), prefer `@testing-library/user-event` over `fireEvent` — it calls the native methods correctly.

## Canonical passing pattern

From `src/features/boards/EditableBoardTitle.test.tsx`:

```52:62:src/features/boards/EditableBoardTitle.test.tsx
    const field = screen.getByRole("textbox", { name: /board title/i });
    field.focus();
    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.blur(field);

    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels the edit on Escape", () => {
    const onSave = vi.fn();

```

Notes:

- `.focus()` is called directly on the queried element.
- `fireEvent.change` and `fireEvent.blur` are still fine for non-focus events; their failure modes don't involve serializing DOM nodes.
- Assertions about whether a callback fired use `expect(mock).toHaveBeenCalledWith(...)` / `.not.toHaveBeenCalled()`, which never pass DOM nodes through the assertion engine.

## Antipattern to recognize

```ts
// BAD — both lines together produce the OOM hang.
fireEvent.focus(field);
assert.equal(document.activeElement, field);
//     ^^^^^                          ^^^^^
//     `equal` will fail (activeElement is <body>) and serialize a full Tamagui DOM tree.
```

Either line is individually problematic in this codebase: the first because it doesn't do what the test author thinks it does, the second because it can OOM on any DOM mismatch in a non-trivial render.

## Running a suspect test safely

If a test seems to hang, run it under the kill-guarded harness so it cannot crash the host:

```bash
scripts/test-guard.sh <path-to-test-file> [timeout-sec=25] [rss-mb-cap=800]
```

The guard:

- Launches `npx vitest run <file>` in its own process group.
- Polls every 0.5s for elapsed time and total descendant RSS.
- On either limit, SIGKILLs the entire process group and prints the last 80 lines of vitest output.

A clean exit with a hung-symptom signature inside the output is strong evidence the test hit the DOM-serializer trap. Inspect every `assert.equal` / `assert.deepEqual` line that touches a DOM-shaped value.

## Migrating an existing test

When you see `node:assert/strict` being used near DOM in an existing test, prefer the smallest mechanical change:

1. Keep `node:assert/strict` for non-DOM values (numbers, strings, plain objects, mock state).
2. For each DOM-touching assertion, swap to the Vitest equivalent:
   - `assert.equal(a, b)` → `expect(a).toBe(b)`
   - `assert.deepEqual(a, b)` → `expect(a).toEqual(b)`
   - `assert.notEqual(a, b)` → `expect(a).not.toBe(b)`
3. If the test uses `fireEvent.focus` and asserts on `document.activeElement`, also change `fireEvent.focus(el)` → `el.focus()` in the same edit.

Don't blanket-replace `assert.*` everywhere — `node:assert/strict` is fine and idiomatic for the rest of the suite.

## Good reference files

- `src/features/boards/EditableBoardTitle.test.tsx` — current canonical pattern for a controlled-input focus/blur/change test.
- `src/form/FormFields.test.tsx` — RHF form fields covered without focus assertions.
- `scripts/test-guard.sh` — the kill-guarded runner for suspect tests.
