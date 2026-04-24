# Open Questions Log: Board Shell and Board Loading States

## 1. Product Questions

### Question: Should `/boards` eventually remain a simple index, or should it grow search / recents / sorting controls?

- Current assumption in the canonical spec: `/boards` is a straightforward updated-descending list with no extra controls
- Alternative: add recents, search, sort, or board grouping later
- Status: open
- Blocking: no
- Why it matters:
  - affects long-term protected-shell complexity
  - affects whether the board index stays lightweight or becomes a dashboard

### Question: Should every new board always start with `To do / In progress / Done`?

- Current assumption in the canonical spec: yes, for this slice
- Alternative: later allow templates or custom starter columns
- Status: open
- Blocking: no for this slice
- Why it matters:
  - affects board-create expectations
  - affects first-run empty board behavior

## 2. Recorded Engineering Decisions

These are the active decisions carried into this slice:

- create-board form: `react-hook-form`
- create-board dialog foundation: `PrettyModalWrap`
- future drag-and-drop for cards/columns: `@hello-pangea/dnd`
- future virtualization partner for DnD lists: `react-window`
- future complex selects/comboboxes/filter menus: prefer official Tamagui packages
- future toasts / undo / transient status UI: prefer official Tamagui packages
- extra motion library: defer

## 3. Future-Slice Coordination Questions

### Question: When card detail is added, should card activation open a modal or a side panel?

- Current assumption: card tiles are read-only in this slice
- Status: open
- Blocking: no for the shell slice, yes for the card-detail slice

### Question: Where should future board-level settings live?

- Current assumption: this slice exposes only `Create board` and `Sign out` in the shell header
- Alternatives:
  - board settings in the header
  - board settings on a separate route
- Status: open
- Blocking: no

### Question: Will the mobile board-detail layout stay vertically stacked once reorder and detail interactions exist?

- Current assumption: yes for this foundational slice
- Status: open
- Blocking: no for this slice, yes for later mobile interaction work

## 4. Tracking Summary

- Blocking questions: none
- Non-blocking product questions: 2
- Non-blocking engineering sign-offs: 0
- Non-blocking future-slice coordination questions: 3
